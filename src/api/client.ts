import axios, {AxiosInstance, InternalAxiosRequestConfig} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
// eslint-disable-next-line @react-native/no-deep-imports
import getDevServer from 'react-native/Libraries/Core/Devtools/getDevServer';

const API_PORT = 8090;
const METRO_PORT = 8081;
const BASE_URL_STORAGE_KEY = 'api_base_url';
const LAN_IP_STORAGE_KEY = 'api_lan_ip';
const PROBE_TIMEOUT = 2500;

// Set this to a fixed API URL to skip auto-detection entirely, e.g.
//   const MANUAL_BASE_URL = 'http://192.168.1.50:8090/api/v1';
const MANUAL_BASE_URL = '';

type RetryableConfig = InternalAxiosRequestConfig & {_hostRetried?: boolean};

// The JS bundle is always served by Metro on the dev machine, so the bundle
// URL's host is the most reliable first guess for where the API lives.
//  - Physical device over USB with adb reverse: host resolves to localhost
//  - Device over Wi-Fi: host resolves to your computer's LAN IP
//  - Android emulator: host resolves to 10.0.2.2
function getDevServerHost(): string {
  try {
    const {url} = getDevServer();
    if (url) {
      const {hostname} = new URL(url);
      if (hostname) {
        return hostname;
      }
    }
  } catch {
    // fall through to the candidate list below
  }
  return '';
}

const devHost = getDevServerHost();

// Base candidates. The remembered LAN IP (added at runtime once discovered) lets
// a USB device reach the API over Wi-Fi without any `adb reverse` rule.
const STATIC_HOSTS = (() => {
  const hosts: string[] = [];
  if (devHost) {
    hosts.push(devHost);
  }
  hosts.push('localhost');
  if (Platform.OS === 'android') {
    hosts.push('10.0.2.2');
  }
  return Array.from(new Set(hosts));
})();

let baseUrl = '';
let cachedUrl: string | null = null;
let lanIp: string | null = null;
let loaded = false;
let ensurePromise: Promise<string> | null = null;

async function ensureLoaded(): Promise<void> {
  if (loaded) {
    return;
  }
  loaded = true;
  try {
    const [saved, ip] = await Promise.all([
      AsyncStorage.getItem(BASE_URL_STORAGE_KEY),
      AsyncStorage.getItem(LAN_IP_STORAGE_KEY),
    ]);
    cachedUrl = saved || null;
    lanIp = ip || null;
  } catch {
    // ignore
  }
}

function candidateUrls(): string[] {
  const urls: string[] = [];
  const add = (u: string) => {
    if (u && !urls.includes(u)) {
      urls.push(u);
    }
  };
  // The previously confirmed host is tried first (fast path).
  if (cachedUrl) {
    add(cachedUrl);
  }
  STATIC_HOSTS.forEach(h => add(`http://${h}:${API_PORT}/api/v1`));
  if (lanIp) {
    add(`http://${lanIp}:${API_PORT}/api/v1`);
  }
  return urls;
}

// A host is "reachable" if the server answered at all (even 404/401). Only a
// network-level failure means the host itself is unreachable.
async function probe(url: string, timeout = PROBE_TIMEOUT): Promise<boolean> {
  try {
    await axios.get(url, {timeout});
    return true;
  } catch (err: any) {
    return !!err.response;
  }
}

async function findFirstWorking(urls: string[]): Promise<string | null> {
  const results = await Promise.allSettled(urls.map(u => probe(u)));
  for (let i = 0; i < urls.length; i++) {
    if (results[i].status === 'fulfilled' && (results[i] as PromiseFulfilledResult<boolean>).value) {
      return urls[i];
    }
  }
  return null;
}

// Only ever persist a host after it has been confirmed to respond. Caching a
// host on failure is what previously trapped the app on a dead address.
async function persistGoodUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(BASE_URL_STORAGE_KEY, url);
  } catch {
    // ignore
  }
}

// The Metro dev server runs on the dev machine. Over USB the device reaches it
// through `adb reverse tcp:8081` (applied automatically when the app is
// installed/launched), so asking it for the host's LAN IP gives us an address
// that works for the API WITHOUT depending on an `adb reverse` rule for port
// 8090 (which is easily lost when adb restarts or the phone reconnects).
async function discoverLanIp(): Promise<string | null> {
  const host = devHost || 'localhost';
  try {
    const res = await axios.get(`http://${host}:${METRO_PORT}/__host_ips`, {timeout: 3000});
    const ips: string[] = res?.data?.ips || [];
    const ip = ips.find(i => i && !i.startsWith('127.'));
    return ip || null;
  } catch {
    return null;
  }
}

async function doEnsureWorkingBaseUrl(excludeUrl?: string): Promise<string> {
  await ensureLoaded();
  if (MANUAL_BASE_URL) {
    return MANUAL_BASE_URL;
  }

  // Fast path: the current/remembered URL still responds.
  const current = baseUrl || candidateUrls()[0];
  if (current && current !== excludeUrl && (await probe(current))) {
    baseUrl = current;
    await persistGoodUrl(current);
    return current;
  }

  // Parallel sweep of the remaining candidates.
  const sweep = candidateUrls().filter(u => u !== current && u !== excludeUrl);
  const found = await findFirstWorking(sweep);
  if (found) {
    baseUrl = found;
    await persistGoodUrl(found);
    return found;
  }

  // Last resort: learn the host's LAN IP through Metro and try it once. This is
  // what keeps the app working after `adb reverse tcp:8090` is lost.
  const ip = lanIp || (await discoverLanIp());
  if (ip) {
    lanIp = ip;
    try {
      await AsyncStorage.setItem(LAN_IP_STORAGE_KEY, ip);
    } catch {
      // ignore
    }
    const url = `http://${ip}:${API_PORT}/api/v1`;
    if (await probe(url)) {
      baseUrl = url;
      await persistGoodUrl(url);
      return url;
    }
  }

  baseUrl = candidateUrls()[0];
  return baseUrl;
}

// Concurrent callers share a single resolution so we never stack duplicate
// probe sweeps. Pass `excludeUrl` to skip a host that just failed a request.
function ensureWorkingBaseUrl(excludeUrl?: string): Promise<string> {
  if (!ensurePromise) {
    ensurePromise = doEnsureWorkingBaseUrl(excludeUrl).finally(() => {
      ensurePromise = null;
    });
  }
  return ensurePromise;
}

const apiClient: AxiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.baseURL = MANUAL_BASE_URL || baseUrl || (await ensureWorkingBaseUrl());

    const token = await AsyncStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const companyId = await AsyncStorage.getItem('company_id');
    if (companyId && config.headers) {
      config.headers['x-company-id'] = companyId;
    }

    return config;
  },
  error => Promise.reject(error),
);

apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('company_id');
      await AsyncStorage.removeItem('user_data');
      return Promise.reject(error);
    }

    // Network-level failure (server unreachable). Find a working host (without
    // re-probing the one that just failed), remember it, and retry once.
    if (!error.response && !MANUAL_BASE_URL) {
      const config = error.config as RetryableConfig | undefined;
      if (config && !config._hostRetried) {
        const working = await ensureWorkingBaseUrl(config.baseURL);
        const retryConfig: RetryableConfig = {
          ...config,
          baseURL: working,
          _hostRetried: true,
        };
        return apiClient.request(retryConfig);
      }
    }

    return Promise.reject(error);
  },
);

export async function getApiBaseUrl(): Promise<string> {
  return ensureWorkingBaseUrl();
}

export default apiClient;
