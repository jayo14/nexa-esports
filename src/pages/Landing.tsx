
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Users, Trophy, Target, ArrowRight, Star, Gamepad2, Mail, BookOpen, ShoppingBag } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ClanGallery } from '@/components/ClanGallery';
import { ContactForm } from '@/components/ContactForm';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10"></div>
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '2s'}}></div>
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,31,68,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,31,68,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 bg-card/40 backdrop-blur-xl border-b border-border/30 shadow-lg">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-20 h-20 flex items-center justify-center nexa-glow rounded-xl ring-2 ring-primary/30 hover:ring-primary/50 transition-all duration-300 hover:scale-105">
              <img src="/nexa-logo.jpg" alt="NeXa Esports Logo" className="object-cover w-full h-full rounded-xl" />
            </div>
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/blog">
              <Button variant="ghost" className="text-foreground hover:text-primary font-rajdhani font-bold hover:bg-primary/10 transition-all">
                <BookOpen className="w-4 h-4 mr-2" />
                Blog
              </Button>
            </Link>
            <Link to="/marketplace-info">
              <Button variant="ghost" className="text-foreground hover:text-primary font-rajdhani font-bold hover:bg-primary/10 transition-all">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Marketplace
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link to="/auth/login">
            <Button variant="ghost" className="text-foreground hover:text-primary font-rajdhani font-bold text-lg hover:bg-primary/10 transition-all">
              Login
            </Button>
          </Link>
          <Link to="/auth/signup">
            <Button className="nexa-button font-rajdhani font-black text-lg px-6">
              Join Clan
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20 md:py-32 text-center">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 animate-fade-in">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/50 rounded-full mb-8 nexa-glow backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <Target className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm text-primary font-bold font-rajdhani tracking-wider">NeXa_Esports Clan</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-orbitron font-black mb-8 leading-none">
              <span className="block bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent animate-fade-in">
                DOMINATE
              </span>
              <span className="block mt-2 bg-gradient-to-r from-primary via-red-400 to-primary bg-clip-text text-transparent animate-scale-in" style={{animationDelay: '0.2s'}}>
                THE GAME
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-rajdhani font-medium">
              Elite <span className="text-primary font-bold">Call of Duty: Mobile</span> warriors unite. 
              Experience tactical precision, unwavering brotherhood, and competitive excellence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16 animate-fade-in" style={{animationDelay: '0.4s'}}>
            <Link to="/auth/signup">
              <Button size="lg" className="nexa-button px-10 py-6 text-xl font-rajdhani font-bold group shadow-2xl hover:shadow-primary/50">
                <Shield className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
                Join the Elite
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="#about">
              <Button size="lg" variant="outline" className="border-2 border-primary/50 text-foreground hover:bg-primary/10 hover:border-primary px-10 py-6 text-xl font-rajdhani font-bold transition-all duration-300 backdrop-blur-sm group">
                <Gamepad2 className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Explore Clan
              </Button>
            </Link>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto animate-fade-in" style={{animationDelay: '0.6s'}}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative text-center p-8 bg-card/90 backdrop-blur-sm border-2 border-border/50 rounded-2xl hover:border-primary/50 hover:scale-105 transition-all duration-300">
                <div className="text-5xl font-orbitron font-black text-primary mb-3 bg-gradient-to-br from-primary to-red-400 bg-clip-text text-transparent">70+</div>
                <div className="text-foreground font-rajdhani font-bold text-lg uppercase tracking-wider">Elite Warriors</div>
                <div className="text-muted-foreground text-sm mt-1">Active Members</div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative text-center p-8 bg-card/90 backdrop-blur-sm border-2 border-border/50 rounded-2xl hover:border-primary/50 hover:scale-105 transition-all duration-300">
                <div className="text-5xl font-orbitron font-black text-primary mb-3 bg-gradient-to-br from-primary to-red-400 bg-clip-text text-transparent">95%</div>
                <div className="text-foreground font-rajdhani font-bold text-lg uppercase tracking-wider">Win Rate</div>
                <div className="text-muted-foreground text-sm mt-1">Tournament Success</div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative text-center p-8 bg-card/90 backdrop-blur-sm border-2 border-border/50 rounded-2xl hover:border-primary/50 hover:scale-105 transition-all duration-300">
                <div className="text-5xl font-orbitron font-black text-primary mb-3 bg-gradient-to-br from-primary to-red-400 bg-clip-text text-transparent">#1</div>
                <div className="text-foreground font-rajdhani font-bold text-lg uppercase tracking-wider">Regional Rank</div>
                <div className="text-muted-foreground text-sm mt-1">Competitive Standing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clan Gallery */}
      <ClanGallery />

      {/* About Section */}
      <section id="about" className="relative z-10 px-6 py-24 bg-gradient-to-b from-transparent via-card/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block px-6 py-2 bg-primary/10 border border-primary/30 rounded-full mb-6 nexa-glow">
              <span className="text-primary font-rajdhani font-bold uppercase tracking-wider">What We Offer</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-orbitron font-black mb-6">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Why Join NeXa?
              </span>
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto font-rajdhani font-medium leading-relaxed">
              More than a clan—we're a <span className="text-primary font-bold">brotherhood</span> of elite gamers 
              dominating the competitive CoDM scene.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative p-8 bg-card/60 backdrop-blur-sm border-2 border-border/50 rounded-2xl hover:border-primary/50 hover:-translate-y-2 transition-all duration-300">
                <div className="w-20 h-20 bg-gradient-to-br from-primary via-red-400 to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg shadow-primary/20">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-orbitron font-black mb-4 text-foreground text-center">Tactical Mastery</h3>
                <p className="text-muted-foreground font-rajdhani text-center leading-relaxed">Master advanced strategies, map control, and coordinated team plays to dominate every match.</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative p-8 bg-card/60 backdrop-blur-sm border-2 border-border/50 rounded-2xl hover:border-primary/50 hover:-translate-y-2 transition-all duration-300">
                <div className="w-20 h-20 bg-gradient-to-br from-primary via-red-400 to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg shadow-primary/20">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-orbitron font-black mb-4 text-foreground text-center">Elite Community</h3>
                <p className="text-muted-foreground font-rajdhani text-center leading-relaxed">Connect with dedicated players who share your passion and commitment to competitive excellence.</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative p-8 bg-card/60 backdrop-blur-sm border-2 border-border/50 rounded-2xl hover:border-primary/50 hover:-translate-y-2 transition-all duration-300">
                <div className="w-20 h-20 bg-gradient-to-br from-primary via-red-400 to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg shadow-primary/20">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-orbitron font-black mb-4 text-foreground text-center">Championships</h3>
                <p className="text-muted-foreground font-rajdhani text-center leading-relaxed">Compete in high-stakes tournaments and establish your legacy in the global rankings.</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative p-8 bg-card/60 backdrop-blur-sm border-2 border-border/50 rounded-2xl hover:border-primary/50 hover:-translate-y-2 transition-all duration-300">
                <div className="w-20 h-20 bg-gradient-to-br from-primary via-red-400 to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg shadow-primary/20">
                  <Star className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-orbitron font-black mb-4 text-foreground text-center">Rewards System</h3>
                <p className="text-muted-foreground font-rajdhani text-center leading-relaxed">Earn exclusive rewards, recognition, and perks for your contributions and achievements.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-32 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 blur-3xl"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="p-12 md:p-16 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl border-2 border-primary/30 rounded-3xl nexa-glow shadow-2xl">
            <h2 className="text-5xl md:text-7xl font-orbitron font-black mb-8">
              <span className="bg-gradient-to-r from-primary via-red-300 to-primary bg-clip-text text-transparent">
                Ready to Rise?
              </span>
            </h2>
            <p className="text-muted-foreground text-xl md:text-2xl mb-12 max-w-3xl mx-auto font-rajdhani font-medium leading-relaxed">
              Transform your gaming career. Join the elite ranks of <span className="text-primary font-bold">NeXa_Esports</span> and 
              compete at the highest level of Call of Duty: Mobile.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/auth/signup">
                <Button size="lg" className="nexa-button px-14 py-7 text-2xl font-rajdhani font-black group shadow-2xl hover:shadow-primary/50">
                  <Shield className="w-7 h-7 mr-4 group-hover:rotate-12 transition-transform" />
                  Join Now
                  <ArrowRight className="w-7 h-7 ml-4 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              <Link to="/auth/login">
                <Button size="lg" variant="outline" className="border-2 border-primary/50 text-foreground hover:bg-primary/10 hover:border-primary px-14 py-7 text-2xl font-rajdhani font-black backdrop-blur-sm">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="relative z-10 px-6 py-20 bg-gradient-to-b from-transparent to-card/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-6 nexa-glow">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium font-rajdhani">Get in Touch</span>
          </div>
          <h2 className="text-4xl font-orbitron font-bold mb-6">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Contact Us
            </span>
          </h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto font-rajdhani">
            Have questions or want to learn more about NeXa_Esports? Reach out to us!
          </p>

          <ContactForm />
        </div>
      </section>
    </div>
  );
};
