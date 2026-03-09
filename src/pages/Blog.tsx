import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Search,
  BookOpen,
  TrendingUp,
  Shield,
  Trophy,
  Target,
  Newspaper,
  Clock,
  ChevronRight,
  Home,
  Mail,
  User,
} from 'lucide-react';

// Sample blog posts data - in production this would come from a CMS or database
const featuredPosts = [
  {
    id: 1,
    title: 'Master the Current CODM Meta: Top 5 Loadouts for Season 12',
    excerpt: 'Discover the most powerful weapon combinations dominating ranked matches this season. From aggressive rushers to tactical snipers.',
    category: 'Meta & Loadouts',
    author: 'NeXa_TacticalPro',
    readTime: '8 min read',
    date: '2026-01-05',
    image: '/placeholder.svg',
    slug: 'master-codm-meta-season-12',
  },
  {
    id: 2,
    title: 'Account Trading Safety Guide: How to Avoid Scams in 2026',
    excerpt: 'Essential tips for safely buying and selling CODM accounts. Learn about escrow services, verification, and red flags to watch for.',
    category: 'Account Trading & Safety',
    author: 'NeXa_Guardian',
    readTime: '12 min read',
    date: '2026-01-03',
    image: '/placeholder.svg',
    slug: 'account-trading-safety-guide',
  },
  {
    id: 3,
    title: 'Nexaesports Tournament Highlights: Epic Moments from January',
    excerpt: 'Relive the most intense clutches, strategic plays, and comeback victories from our recent competitive tournaments.',
    category: 'Tournaments',
    author: 'NeXa_ClanMaster',
    readTime: '6 min read',
    date: '2026-01-02',
    image: '/placeholder.svg',
    slug: 'tournament-highlights-january',
  },
];

const recentPosts = [
  {
    id: 4,
    title: 'The Psychology of Competitive Gaming: Staying Calm Under Pressure',
    excerpt: 'Mental strategies used by pro players to maintain focus during crucial moments.',
    category: 'CODM Guides',
    author: 'NeXa_Mindset',
    readTime: '10 min read',
    date: '2025-12-28',
    slug: 'psychology-competitive-gaming',
  },
  {
    id: 5,
    title: 'Breaking Down the Best Defense Strategies in Battle Royale',
    excerpt: 'Positioning, rotations, and team coordination tips for dominating BR mode.',
    category: 'CODM Guides',
    author: 'NeXa_BRKing',
    readTime: '7 min read',
    date: '2025-12-25',
    slug: 'defense-strategies-battle-royale',
  },
  {
    id: 6,
    title: 'How to Build Your CODM Account Value Before Selling',
    excerpt: 'Maximize your account worth with these proven strategies and tips.',
    category: 'Account Trading & Safety',
    author: 'NeXa_Trader',
    readTime: '9 min read',
    date: '2025-12-22',
    slug: 'build-account-value',
  },
];

const categories = [
  'All Posts',
  'CODM Guides',
  'Account Trading & Safety',
  'Esports News',
  'Tournaments',
  'Meta & Loadouts',
];

export const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All Posts');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = [...featuredPosts, ...recentPosts].filter((post) => {
    const matchesCategory =
      selectedCategory === 'All Posts' || post.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              <img src="/nexa-logo-ramadan.jpg" alt="NeXa Esports Logo" className="object-cover w-full h-full rounded-xl" />
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
              <Button variant="ghost" className="text-primary font-rajdhani font-bold hover:bg-primary/10 bg-primary/10">
                <BookOpen className="w-4 h-4 mr-2" />
                Blog
              </Button>
            </Link>
            <Link to="/marketplace-info">
              <Button variant="ghost" className="text-foreground hover:text-primary font-rajdhani font-bold hover:bg-primary/10">
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
      <section className="relative z-10 px-6 py-16 md:py-24 text-center bg-gradient-to-b from-card/40 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/50 rounded-full mb-8 nexa-glow backdrop-blur-sm">
            <BookOpen className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm text-primary font-bold font-rajdhani tracking-wider">
              Knowledge Base
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-orbitron font-black mb-6 leading-none">
            <span className="block bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              CODM Guides, Esports News
            </span>
            <span className="block mt-2 bg-gradient-to-r from-primary via-red-400 to-primary bg-clip-text text-transparent">
              & Pro Tips
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto font-rajdhani">
            Level up your game with expert strategies, stay informed on esports news,
            and learn safe account trading practices from the Nexaesports community.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search guides, news, tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg font-rajdhani bg-card/80 backdrop-blur-sm border-2 border-border/50 focus:border-primary/50 rounded-xl"
              />
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="max-w-xl mx-auto p-6 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-orbitron font-bold">Stay Updated</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4 font-rajdhani">
              Get the latest guides and esports news delivered to your inbox weekly.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="font-rajdhani bg-card/80 backdrop-blur-sm"
              />
              <Button className="nexa-button font-rajdhani font-bold whitespace-nowrap">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="relative z-10 px-6 py-8 border-b border-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className={`font-rajdhani font-bold ${selectedCategory === category
                    ? 'nexa-button'
                    : 'border-2 border-border/50 hover:border-primary/50'
                  }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {selectedCategory === 'All Posts' && (
        <section className="relative z-10 px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-orbitron font-bold">Featured Posts</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="group hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden bg-card/80 backdrop-blur-sm"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary/90 backdrop-blur-sm font-rajdhani font-bold">
                        {post.category}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl font-orbitron group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground font-rajdhani line-clamp-3">
                      {post.excerpt}
                    </p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 font-rajdhani">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2 font-rajdhani">
                      <Clock className="w-4 h-4" />
                      <span>{post.readTime}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Newspaper className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-orbitron font-bold">
              {selectedCategory === 'All Posts' ? 'Recent Posts' : selectedCategory}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Card
                key={post.id}
                className="group hover:border-primary/50 transition-all duration-300 cursor-pointer bg-card/80 backdrop-blur-sm"
                onClick={() => navigate(`/blog/${post.slug}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-primary/20 text-primary border border-primary/30 font-rajdhani font-bold">
                      {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-rajdhani">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-orbitron group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-rajdhani line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 font-rajdhani">
                      <User className="w-4 h-4" />
                      <span className="text-xs">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2 font-rajdhani">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">{post.readTime}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="ghost"
                    className="w-full group-hover:bg-primary/10 font-rajdhani font-bold"
                  >
                    Read More
                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-xl text-muted-foreground font-rajdhani">
                No posts found matching your criteria.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 px-6 py-16 bg-gradient-to-t from-card/40 to-transparent border-t border-border/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-orbitron font-bold mb-6">
            Ready to <span className="text-primary">Dominate</span> the Game?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 font-rajdhani">
            Join Nexaesports clan and access exclusive tournaments, pro training, and secure account trading.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/signup">
              <Button size="lg" className="nexa-button font-rajdhani font-black text-lg px-8 py-6">
                <Shield className="w-5 h-5 mr-2" />
                Join Elite Clan
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/marketplace-info">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary/50 hover:bg-primary/10 hover:border-primary font-rajdhani font-black text-lg px-8 py-6"
              >
                <Target className="w-5 h-5 mr-2" />
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
