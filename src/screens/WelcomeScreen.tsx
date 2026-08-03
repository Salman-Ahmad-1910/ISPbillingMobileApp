import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const {width} = Dimensions.get('window');

const features = [
  {
    icon: '👥',
    title: 'Customer Management',
    desc: 'Complete CRM system with detailed customer profiles and communication tracking.',
  },
  {
    icon: '💳',
    title: 'Billing & Payments',
    desc: 'Automated invoice generation, multiple payment methods, and due date reminders.',
  },
  {
    icon: '📦',
    title: 'Inventory Management',
    desc: 'Real-time stock tracking, product catalog management, and equipment allocation.',
  },
  {
    icon: '🎧',
    title: 'Support System',
    desc: 'Complaint tracking, alert management, support tickets, and resolution tracking.',
  },
  {
    icon: '⚙️',
    title: 'Admin & Control',
    desc: 'User role management, company administration, and system configuration.',
  },
  {
    icon: '📊',
    title: 'Analytics & Reports',
    desc: 'Real-time analytics, custom reports, revenue tracking, and business intelligence.',
  },
];

const roles = [
  {abbr: 'KB', title: 'Super Admin', desc: 'Complete system control'},
  {abbr: 'AD', title: 'Admin', desc: 'Company-level management'},
  {abbr: 'BI', title: 'Billing Staff', desc: 'Financial operations'},
  {abbr: 'SP', title: 'Support Staff', desc: 'Customer service'},
];

export default function WelcomeScreen({navigation}: any) {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroBg}>
            <View style={styles.heroOrb1} />
            <View style={styles.heroOrb2} />
            <View style={styles.heroOrb3} />
          </View>
          <View style={styles.heroContent}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Enterprise-Grade ISP Management Platform</Text>
            </View>
            <Text style={styles.heroTitle}>
              Complete Business{'\n'}Management
            </Text>
            <Text style={styles.heroGradient}>Simplified & Powerful</Text>
            <Text style={styles.heroSubtitle}>
              Transform your Internet Service Provider operations with our comprehensive ERP solution. From subscriber management to network monitoring, everything you need in one powerful platform.
            </Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>Features</Text>
          </View>
          <Text style={styles.sectionTitle}>Everything You Need to Succeed</Text>
          <Text style={styles.sectionSubtitle}>
            Comprehensive tools designed specifically for ISP operations and growth
          </Text>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureIconText}>{feature.icon}</Text>
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* User Roles Section */}
        <View style={[styles.section, styles.rolesSection]}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>User Roles</Text>
          </View>
          <Text style={styles.sectionTitle}>Perfect for Every Team Member</Text>
          <Text style={styles.sectionSubtitle}>
            Role-based access control ensures everyone has the right tools for their job
          </Text>

          <View style={styles.rolesGrid}>
            {roles.map((role, index) => (
              <View key={index} style={styles.roleCard}>
                <View style={styles.roleAvatar}>
                  <Text style={styles.roleAbbr}>{role.abbr}</Text>
                </View>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>About Fintrack ERP</Text>
          </View>
          <Text style={styles.sectionTitle}>Empowering ISPs Worldwide Since 2020</Text>
          <Text style={styles.sectionSubtitle}>
            Built by professionals, for Internet Service Providers globally
          </Text>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutHeading}>Our Mission</Text>
            <Text style={styles.aboutText}>
              To provide ISPs worldwide with world-class management software that understands global business needs, regulatory requirements, and market challenges.
            </Text>
            <Text style={[styles.aboutHeading, {marginTop: 20}]}>Why Choose Fintrack ERP?</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>Designed for global market conditions and regulations</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>Support for multiple payment methods and currencies</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>24/7 multilingual customer support</Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Transform Your ISP Business?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of ISPs worldwide who trust Fintrack ERP for their daily operations
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.ctaButtonText}>Start Your Free Trial</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>2026 Fintrack ERP. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Bottom Auth Buttons - Fixed */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signupButton}
          onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.signupButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero
  hero: {
    backgroundColor: '#F0F4FF',
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOrb1: {
    position: 'absolute',
    top: 20,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  heroOrb2: {
    position: 'absolute',
    top: 60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  heroOrb3: {
    position: 'absolute',
    bottom: 20,
    left: '40%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 8,
  },
  heroGradient: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2563EB',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  sectionBadge: {
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Features
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Roles
  rolesSection: {
    backgroundColor: '#F9FAFB',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  roleAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleAbbr: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // About
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aboutHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 12,
    gap: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1F2937',
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // CTA
  ctaSection: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 15,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Footer
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 30,
    gap: 12,
  },
  loginButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  signupButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
