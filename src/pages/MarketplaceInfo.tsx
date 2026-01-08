import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Shield,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Lock,
  Users,
  User,
  Star,
  BadgeCheck,
  Eye,
  FileCheck,
  AlertTriangle,
  MessageSquare,
  CreditCard,
  Target,
  Home,
  BookOpen,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Zap,
  Award,
} from 'lucide-react';

export const MarketplaceInfo: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10"></div>
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,31,68,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,31,68,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 bg-card/40 backdrop-blur-xl border-b border-border/30 shadow-lg">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-16 h-16 flex items-center justify-center nexa-glow rounded-xl ring-2 ring-primary/30 hover:ring-primary/50 transition-all duration-300 hover:scale-105">
              <img src="/nexa-logo.jpg" alt="NeXa Esports Logo" className="object-cover w-full h-full rounded-xl" />
            </div>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/">
              <Button variant="ghost" className="text-foreground hover:text-primary font-rajdhani font-bold hover:bg-primary/10">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link to="/blog">
              <Button variant="ghost" className="text-foreground hover:text-primary font-rajdhani font-bold hover:bg-primary/10">
                <BookOpen className="w-4 h-4 mr-2" />
                Blog
              </Button>
            </Link>
            <Link to="/marketplace-info">
              <Button variant="ghost" className="text-primary font-rajdhani font-bold hover:bg-primary/10 bg-primary/10">
                <Shield className="w-4 h-4 mr-2" />
                Marketplace
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link to="/auth/login">
            <Button variant="ghost" className="text-foreground hover:text-primary font-rajdhani font-bold hover:bg-primary/10">
              Login
            </Button>
          </Link>
          <Link to="/auth/signup">
            <Button className="nexa-button font-rajdhani font-black">
              Join Clan
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20 md:py-28 text-center bg-gradient-to-b from-card/40 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/50 rounded-full mb-8 nexa-glow backdrop-blur-sm">
            <Shield className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm text-primary font-bold font-rajdhani tracking-wider">
              Secure Trading Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-orbitron font-black mb-6 leading-none">
            <span className="block bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              Buy & Sell CODM Accounts
            </span>
            <span className="block mt-2 bg-gradient-to-r from-primary via-red-400 to-primary bg-clip-text text-transparent">
              Safely, Securely, Confidently
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto font-rajdhani font-medium">
            Trade Call of Duty Mobile accounts with complete protection. 
            <span className="text-primary font-bold"> Escrow-backed transactions</span>, 
            verified vendors, and <span className="text-primary font-bold">zero scams</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/marketplace">
              <Button size="lg" className="nexa-button px-10 py-6 text-xl font-rajdhani font-black group shadow-2xl hover:shadow-primary/50">
                <ShoppingBag className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Explore Marketplace
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/auth/signup">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary/50 hover:bg-primary/10 hover:border-primary px-10 py-6 text-xl font-rajdhani font-black group"
              >
                <Award className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
                Become a Verified Seller
              </Button>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Shield, label: 'Escrow Protected', desc: '100% Secure' },
              { icon: BadgeCheck, label: 'Verified Vendors', desc: 'ID Checked' },
              { icon: Lock, label: 'Encrypted Payments', desc: 'SSL Secured' },
              { icon: MessageSquare, label: '24/7 Support', desc: 'Always Here' },
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl blur-lg group-hover:blur-xl transition-all"></div>
                <div className="relative p-4 bg-card/90 backdrop-blur-sm border-2 border-border/50 rounded-xl hover:border-primary/50 transition-all">
                  <item.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-orbitron font-bold">{item.label}</p>
                  <p className="text-xs text-muted-foreground font-rajdhani">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is the Marketplace Section */}
      <section className="relative z-10 px-6 py-16 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-orbitron font-black mb-6">
              What is the Nexaesports <span className="text-primary">CODM Marketplace</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-rajdhani leading-relaxed">
              A revolutionary trading platform built specifically for Call of Duty Mobile players. 
              Buy and sell accounts with complete peace of mind, backed by the trusted Nexaesports brand.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'No Scams',
                description: 'Every transaction is protected by our secure escrow system. Your money stays safe until you confirm account delivery.',
              },
              {
                icon: BadgeCheck,
                title: 'Verified Vendors',
                description: 'All sellers undergo identity verification and reputation checks. Trade with confidence knowing who you\'re dealing with.',
              },
              {
                icon: TrendingUp,
                title: 'Transparent Pricing',
                description: 'Fair market rates with no hidden fees. See exactly what you\'re paying for with detailed account statistics and ratings.',
              },
            ].map((feature, index) => (
              <Card key={index} className="group hover:border-primary/50 transition-all bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="font-orbitron text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-rajdhani leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="relative z-10 px-6 py-16 bg-gradient-to-b from-card/20 to-transparent border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-orbitron font-black mb-6">
              Two Types of <span className="text-primary">Trusted Sellers</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-rajdhani">
              Choose from public sellers or elite Nexa Players for your next account purchase.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Public Sellers */}
            <Card className="border-2 border-border/50 hover:border-primary/30 transition-all bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-border/30 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-8 h-8 text-blue-400" />
                  <CardTitle className="text-2xl font-orbitron">Public Sellers</CardTitle>
                </div>
                <p className="text-muted-foreground font-rajdhani">
                  Anyone can list and sell accounts
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-rajdhani font-bold">Open to All</p>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        Any registered user can create listings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileCheck className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-rajdhani font-bold">Manual Review</p>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        All listings reviewed by our team before going live
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-rajdhani font-bold">Identity Checks</p>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        Basic verification required for all sellers
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-rajdhani font-bold">Platform Rules</p>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        Must comply with our trading guidelines and policies
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nexa Players */}
            <Card className="border-2 border-primary/50 hover:border-primary transition-all bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary/90 backdrop-blur-sm font-rajdhani font-black text-sm">
                  PREMIUM
                </Badge>
              </div>
              <CardHeader className="border-b border-primary/30 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="w-8 h-8 text-primary" />
                  <CardTitle className="text-2xl font-orbitron">Nexa Players</CardTitle>
                </div>
                <p className="text-muted-foreground font-rajdhani">
                  Fully verified Nexaesports clan members
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-rajdhani font-bold text-primary">Elite Verification</p>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        Extensive background checks and identity verification
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-rajdhani font-bold text-primary">Higher Trust Rating</p>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        Proven track record within Nexaesports community
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-rajdhani font-bold text-primary">Priority Visibility</p>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        Listings featured prominently in marketplace
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-rajdhani font-bold text-primary">Verified Badge</p>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        Special badge displayed on all listings and profile
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security & Trust System */}
      <section className="relative z-10 px-6 py-16 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500/20 to-green-500/10 border border-green-500/50 rounded-full mb-6">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-500 font-bold font-rajdhani tracking-wider">
                MAXIMUM SECURITY
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-orbitron font-black mb-6">
              How We Keep You <span className="text-primary">100% Safe</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-rajdhani">
              Multiple layers of protection ensure every transaction is secure from start to finish.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Lock,
                title: 'Escrow-Based Transactions',
                description: 'Your payment is held securely until you confirm the account is delivered and working. Seller only gets paid after you approve.',
              },
              {
                icon: FileCheck,
                title: 'Account Validation',
                description: 'Every account listing is verified for accuracy. Stats, ranks, and items are checked before approval.',
              },
              {
                icon: Star,
                title: 'Vendor Reputation System',
                description: 'Detailed seller ratings and reviews from real buyers. See transaction history and success rates.',
              },
              {
                icon: MessageSquare,
                title: 'Dispute Resolution',
                description: 'Professional support team available 24/7 to resolve any issues. Fair arbitration process protects both parties.',
              },
              {
                icon: Eye,
                title: 'Transaction Monitoring',
                description: 'All trades logged and audited. Suspicious activity triggers automatic security checks.',
              },
              {
                icon: AlertTriangle,
                title: 'Anti-Fraud Detection',
                description: 'AI-powered fraud monitoring identifies and blocks scammers before they can harm legitimate users.',
              },
              {
                icon: CreditCard,
                title: 'Secure Payment Processing',
                description: 'Bank-grade encryption protects your financial information. Multiple payment methods supported.',
              },
              {
                icon: Shield,
                title: 'Buyer Protection Guarantee',
                description: 'If something goes wrong, we\'ve got your back. Full refund policy for qualifying disputes.',
              },
              {
                icon: BadgeCheck,
                title: 'Identity Verification',
                description: 'Sellers must verify their identity before listing. Reduces anonymous scammers significantly.',
              },
            ].map((feature, index) => (
              <Card key={index} className="group hover:border-primary/50 transition-all bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="font-orbitron text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground font-rajdhani leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-8 bg-gradient-to-r from-green-500/10 to-green-500/5 border-2 border-green-500/30 rounded-2xl backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl font-orbitron font-bold mb-3 text-green-500">
                  Your Money is Protected Until You Confirm Delivery
                </h3>
                <p className="text-lg text-muted-foreground font-rajdhani leading-relaxed">
                  Unlike random Telegram or Discord sellers, Nexaesports holds your payment in secure escrow. 
                  The seller only receives funds after you verify the account is exactly as described. 
                  If there's any issue, our support team steps in to resolve it fairly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How Buying Works */}
      <section className="relative z-10 px-6 py-16 bg-gradient-to-b from-card/20 to-transparent border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-orbitron font-black mb-6">
              How <span className="text-primary">Buying</span> Works
            </h2>
            <p className="text-xl text-muted-foreground font-rajdhani">
              Simple, secure, and straightforward. Get your dream CODM account in 5 easy steps.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: 1,
                title: 'Browse CODM Accounts',
                description: 'Explore hundreds of listings with detailed stats, screenshots, and seller ratings. Use filters to find exactly what you need.',
                icon: ShoppingBag,
              },
              {
                step: 2,
                title: 'Check Seller Rating & Account Details',
                description: 'Review seller reputation, transaction history, and complete account information including level, rank, skins, and weapons.',
                icon: Eye,
              },
              {
                step: 3,
                title: 'Pay Securely via Nexaesports',
                description: 'Choose your payment method and complete checkout. Your money goes into secure escrow - not directly to the seller.',
                icon: CreditCard,
              },
              {
                step: 4,
                title: 'Account Delivered',
                description: 'Seller provides account credentials through our secure messaging system. Log in and verify everything is as described.',
                icon: CheckCircle,
              },
              {
                step: 5,
                title: 'Buyer Confirms → Seller Gets Paid',
                description: 'Once you confirm the account is correct, we release payment to the seller. If there\'s an issue, open a dispute instead.',
                icon: BadgeCheck,
              },
            ].map((item, index) => (
              <Card key={index} className="group hover:border-primary/50 transition-all bg-card/80 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-2xl font-orbitron font-black">
                        {item.step}
                      </div>
                      {index < 4 && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-primary/50 to-transparent"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <item.icon className="w-6 h-6 text-primary" />
                        <h3 className="text-2xl font-orbitron font-bold group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground font-rajdhani text-lg leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Buy on Nexaesports - Comparison */}
      <section className="relative z-10 px-6 py-16 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-orbitron font-black mb-6">
              Why Buy on <span className="text-primary">Nexaesports</span>?
            </h2>
            <p className="text-xl text-muted-foreground font-rajdhani">
              See the difference between random sellers and our secure platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Random Sellers */}
            <Card className="border-2 border-red-500/30 bg-red-500/5 backdrop-blur-sm">
              <CardHeader className="border-b border-red-500/20">
                <CardTitle className="text-2xl font-orbitron flex items-center gap-3">
                  <XCircle className="w-7 h-7 text-red-500" />
                  Random Telegram Sellers
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {[
                    'No identity verification',
                    'Direct payment to stranger',
                    'No buyer protection',
                    'High scam risk',
                    'No dispute resolution',
                    'Anonymous sellers',
                    'No transaction records',
                    'Can\'t verify account before paying',
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <span className="text-muted-foreground font-rajdhani">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Nexaesports */}
            <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm">
              <CardHeader className="border-b border-primary/30">
                <CardTitle className="text-2xl font-orbitron flex items-center gap-3">
                  <CheckCircle className="w-7 h-7 text-primary" />
                  Nexaesports Marketplace
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {[
                    'Verified sellers with ID checks',
                    'Secure escrow protection',
                    'Comprehensive buyer guarantee',
                    'Zero tolerance for scams',
                    'Professional support team',
                    'Transparent seller ratings',
                    'Full transaction audit trails',
                    'Test account before confirming',
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="font-rajdhani font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-2xl font-orbitron font-bold mb-4">
              The Choice is <span className="text-primary">Clear</span>
            </p>
            <p className="text-lg text-muted-foreground font-rajdhani max-w-2xl mx-auto">
              Don't risk your hard-earned money with unverified sellers. 
              Trade with confidence on Nexaesports where your security is our priority.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Signals & Testimonials */}
      <section className="relative z-10 px-6 py-16 bg-gradient-to-b from-card/20 to-transparent border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-orbitron font-black mb-6">
              Trusted by <span className="text-primary">CODM Players</span>
            </h2>
            <p className="text-xl text-muted-foreground font-rajdhani">
              Join thousands of satisfied traders who chose security over risk.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                quote: 'Bought my first legendary account here. Smooth process, seller was verified, and support helped with account transfer. Will buy again!',
                author: 'NeXa_Thunder',
                role: 'Verified Buyer',
              },
              {
                quote: 'As a seller, I love the escrow system. Buyers feel safe and I get paid fairly. Much better than dealing with randoms on Telegram.',
                author: 'NeXa_TradeMaster',
                role: 'Verified Seller',
              },
              {
                quote: 'Got scammed twice before finding Nexaesports. Finally bought my dream account safely. The verification badges give real peace of mind.',
                author: 'ClanMember_Pro',
                role: 'Community Member',
              },
            ].map((testimonial, index) => (
              <Card key={index} className="bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-all">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground font-rajdhani mb-6 leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-rajdhani font-bold">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground font-rajdhani">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trust Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '500+', label: 'Accounts Traded', icon: ShoppingBag },
              { value: '98%', label: 'Success Rate', icon: CheckCircle },
              { value: '₦2M+', label: 'Transaction Volume', icon: TrendingUp },
              { value: '24/7', label: 'Support Available', icon: MessageSquare },
            ].map((stat, index) => (
              <div key={index} className="text-center p-6 bg-card/80 backdrop-blur-sm border-2 border-border/50 rounded-xl hover:border-primary/50 transition-all">
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="text-4xl font-orbitron font-black text-primary mb-2">{stat.value}</p>
                <p className="text-sm text-muted-foreground font-rajdhani font-bold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-6 py-20 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5"></div>
            <div className="relative p-12 text-center">
              <h2 className="text-4xl md:text-5xl font-orbitron font-black mb-6">
                Ready to Trade <span className="text-primary">Safely</span>?
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-rajdhani">
                Join Nexaesports today and experience secure, scam-free account trading backed by our community and protection guarantees.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link to="/marketplace">
                  <Button size="lg" className="nexa-button px-10 py-6 text-xl font-rajdhani font-black group">
                    <ShoppingBag className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                    Explore CODM Marketplace
                    <ChevronRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/auth/signup">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-primary/50 hover:bg-primary/10 hover:border-primary px-10 py-6 text-xl font-rajdhani font-black"
                  >
                    <Award className="w-6 h-6 mr-3" />
                    Become a Verified Seller
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/blog/account-trading-safety-guide">
                  <Button
                    variant="ghost"
                    className="text-primary hover:bg-primary/10 font-rajdhani font-bold"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    Read Safety Guide
                  </Button>
                </Link>
                <Link to="/blog">
                  <Button
                    variant="ghost"
                    className="text-primary hover:bg-primary/10 font-rajdhani font-bold"
                  >
                    <Target className="w-5 h-5 mr-2" />
                    Learn Trading Tips
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
