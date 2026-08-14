import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import {useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import {
  Headphones,
  Mail,
  Phone,
  LifeBuoy,
  HelpCircle,
  ChevronDown,
} from 'lucide-react-native';
import {GradientView} from '../../components/GradientView';

const ACCENT_DARK = '#059669';

const CONTACTS = [
  {
    key: 'phone',
    icon: Phone,
    title: 'Phone Support',
    subtitle: 'Our team is available 9am-5pm on weekdays.',
    value: '+1 (234) 567-89',
    gradient: ['#3B82F6', '#06B6D4'] as [string, string],
    onPress: () => Linking.openURL('tel:+123456789').catch(() => {}),
  },
  {
    key: 'email',
    icon: Mail,
    title: 'Email Support',
    subtitle: "We'll get back to you within 24 hours.",
    value: 'support@fintrack.com',
    gradient: ['#10B981', '#059669'] as [string, string],
    onPress: () => Linking.openURL('mailto:support@fintrack.com').catch(() => {}),
  },
  {
    key: 'help',
    icon: LifeBuoy,
    title: 'Help Center',
    subtitle: 'Find articles and guides.',
    value: 'Visit Help Center',
    gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
    onPress: () => Alert.alert('Help Center', 'Coming soon.'),
  },
];

const FAQS = [
  {
    question: 'How do I add a new company?',
    answer:
      'You can add a new company by navigating to Administration > Companies and clicking the "Add Company" button. Only Super Admins have this permission.',
  },
  {
    question: 'How can I change my password?',
    answer:
      'To change your password, click on your profile avatar in the top-right corner, select "Profile", and you will find an option to update your security settings, including your password.',
  },
  {
    question: 'Where can I see my billing details?',
    answer:
      'Your subscription and billing details are available under the "Billing" section in the user menu, accessible from the top-right corner.',
  },
];

function DoorMenuIcon({open}: {open: boolean}) {
  const slide = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 3],
  });

  return (
    <View style={styles.doorIconBox}>
      <Animated.View style={[styles.doorIconLine, {transform: [{translateX}]}]} />
    </View>
  );
}

function ContactSection() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <GradientView colors={['#F43F5E', '#DB2777']} style={styles.cardIcon}>
          <Headphones size={18} color="#FFFFFF" />
        </GradientView>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardTitle}>Contact Us</Text>
          <Text style={styles.cardSubtitle}>We're here to help.</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        {CONTACTS.map((contact, index) => (
          <View key={contact.key} style={[styles.contactRow, index > 0 && styles.contactRowBorder]}>
            <GradientView colors={contact.gradient} style={styles.contactIconBox}>
              <contact.icon size={18} color="#FFFFFF" />
            </GradientView>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>{contact.title}</Text>
              <Text style={styles.contactSubtitle}>{contact.subtitle}</Text>
              <TouchableOpacity onPress={contact.onPress}>
                <Text style={styles.contactValue}>{contact.value}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <GradientView colors={['#F59E0B', '#EA580C']} style={styles.cardIcon}>
          <HelpCircle size={18} color="#FFFFFF" />
        </GradientView>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        {FAQS.map((faq, index) => {
          const open = openIndex === index;
          return (
            <View key={faq.question} style={[styles.faqItem, index > 0 && styles.faqItemBorder]}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => setOpenIndex(open ? null : index)}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <ChevronDown
                  size={18}
                  color="#6B7280"
                  style={{transform: [{rotate: open ? '180deg' : '0deg'}]}}
                />
              </TouchableOpacity>
              {open ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function SupportScreen() {
  const nav = useNavigation();
  const drawerStatus = useDrawerStatus();

  const openDrawer = useCallback(() => {
    nav.dispatch(DrawerActions.openDrawer());
  }, [nav]);

  return (
    <View style={styles.container}>
      <GradientView colors={['#166534', '#22c55e']} style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Support Center</Text>
          <Text style={styles.headerCount}>Get help and find answers</Text>
        </View>
      </GradientView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <GradientView colors={['#10B981', '#059669']} style={styles.heroIconBox}>
            <Headphones size={22} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Support Center</Text>
            <Text style={styles.heroSubtitle}>Get help and find answers to your questions.</Text>
          </View>
        </View>

        <View style={styles.divider}>
          <Svg height="2" width="100%">
            <Defs>
              <LinearGradient id="supportGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#10B981" stopOpacity="1" />
                <Stop offset="0.7" stopColor="#10B981" stopOpacity="0.6" />
                <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="2" fill="url(#supportGrad)" />
          </Svg>
        </View>

        <ContactSection />
        <FaqSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#166534',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#166534',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doorIconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doorIconLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  headerInfo: {paddingRight: 8},
  headerTitle: {fontSize: 16, fontWeight: '700', color: '#FFFFFF'},
  headerCount: {fontSize: 12, color: '#A7F3D0'},
  content: {
    paddingBottom: 40,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heroIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroInfo: {flex: 1},
  heroTitle: {fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.5},
  heroSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  divider: {marginHorizontal: 20, marginBottom: 16},
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#111827',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {flex: 1},
  cardTitle: {fontSize: 16, fontWeight: '700', color: '#111827'},
  cardSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 1},
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  contactRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  contactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInfo: {flex: 1},
  contactTitle: {fontSize: 15, fontWeight: '600', color: '#111827'},
  contactSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  contactValue: {
    fontSize: 13,
    color: ACCENT_DARK,
    fontWeight: '500',
    marginTop: 4,
  },
  faqItem: {
    paddingVertical: 12,
  },
  faqItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
  },
});
