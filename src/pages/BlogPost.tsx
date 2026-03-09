import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  BookOpen,
  Shield,
  Home,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock blog post data - in production this would come from a CMS or database
const blogPosts: Record<string, any> = {
  'master-codm-meta-season-12': {
    title: 'Master the Current CODM Meta: Top 5 Loadouts for Season 12',
    category: 'Meta & Loadouts',
    author: 'NeXa_TacticalPro',
    authorBio: 'Professional CODM player and loadout specialist with 3+ years of competitive experience.',
    readTime: '8 min read',
    date: '2026-01-05',
    image: '/placeholder.svg',
    content: `
      <h2>Understanding the Season 12 Meta</h2>
      <p>Season 12 has brought significant changes to weapon balancing, completely shifting the competitive landscape. In this comprehensive guide, we'll break down the most effective loadouts that are dominating ranked matches and tournaments.</p>
      
      <h3>1. Aggressive SMG Rushers</h3>
      <p>For players who prefer close-quarters combat and aggressive playstyles, the CBR4 with specific attachments provides unmatched mobility and fire rate.</p>
      
      <div class="callout callout-tip">
        <strong>Pro Tip:</strong> Pair this loadout with lightweight and agile perks to maximize your rushing potential. Always pre-aim corners and use slide-fire techniques.
      </div>
      
      <h4>Recommended Attachments:</h4>
      <ul>
        <li>Muzzle: Monolithic Suppressor for stealth</li>
        <li>Barrel: OWC Marksman for increased range</li>
        <li>Optic: Red Dot Sight 3 for quick target acquisition</li>
        <li>Stock: Strike Stock for faster ADS speed</li>
        <li>Ammunition: Extended Mag A for sustained firefights</li>
      </ul>

      <h3>2. Tactical AR Mid-Range Domination</h3>
      <p>The M4 remains a versatile choice for players who want balanced performance across all ranges. This loadout focuses on accuracy and control.</p>

      <div class="callout callout-warning">
        <strong>Warning:</strong> This loadout sacrifices some mobility for stability. Not recommended for aggressive rushing playstyles.
      </div>

      <h3>3. Long-Range Marksman Setup</h3>
      <p>For those who prefer to control sightlines and provide cover fire, the SKS with precision attachments offers excellent stopping power.</p>

      <h3>4. Battle Royale Specialist</h3>
      <p>Optimized for BR mode, this loadout balances versatility with survivability across different terrain types and engagement distances.</p>

      <h3>5. Tournament-Ready Defensive Hold</h3>
      <p>Used by top-tier teams in competitive scrims, this setup focuses on holding objectives and trading kills efficiently.</p>

      <div class="callout callout-info">
        <strong>Did You Know?</strong> Professional teams often practice with specific loadouts for 20+ hours before major tournaments to master recoil patterns.
      </div>

      <h2>Additional Tips for Mastering These Loadouts</h2>
      <ul>
        <li>Spend at least 30 minutes in practice mode with each loadout</li>
        <li>Adjust sensitivity settings for optimal control</li>
        <li>Practice recoil control patterns consistently</li>
        <li>Watch professional players use similar loadouts</li>
        <li>Adapt based on map and game mode</li>
      </ul>

      <h2>Conclusion</h2>
      <p>These five loadouts represent the current meta's strongest options. However, remember that personal playstyle and practice are more important than blindly copying setups. Experiment with these foundations and adapt them to your preferences.</p>

      <p>For more loadout guides and strategy tips, check out our <a href="/blog">complete blog archive</a> or join the <a href="/auth/signup">Nexaesports community</a> for exclusive training sessions.</p>
    `,
  },
  'account-trading-safety-guide': {
    title: 'Account Trading Safety Guide: How to Avoid Scams in 2026',
    category: 'Account Trading & Safety',
    author: 'NeXa_Guardian',
    authorBio: 'Security specialist focused on safe gaming transactions and fraud prevention.',
    readTime: '12 min read',
    date: '2026-01-03',
    image: '/placeholder.svg',
    content: `
      <h2>The Reality of Account Trading Risks</h2>
      <p>The CODM account trading market has grown exponentially, but so have scams and fraudulent activities. This comprehensive guide will teach you how to protect yourself whether you're buying or selling.</p>

      <div class="callout callout-warning">
        <strong>Critical Warning:</strong> Never share your account credentials before receiving payment through a secure escrow service. Account theft is the #1 scam method.
      </div>

      <h2>Understanding Common Scam Types</h2>
      
      <h3>1. The "Payment After" Scam</h3>
      <p>Scammers promise payment after receiving account access but disappear once they have credentials. Always use escrow services.</p>

      <h3>2. Fake Screenshot Payments</h3>
      <p>Buyers send edited screenshots of payment confirmations. Only trust verified payment confirmations from escrow platforms.</p>

      <h3>3. Chargeback Fraud</h3>
      <p>Buyers complete payment then file fraudulent chargebacks after receiving the account. Platform protection is essential.</p>

      <h2>Safe Trading Checklist</h2>
      
      <h3>For Sellers:</h3>
      <ul>
        <li>✓ Only list on verified platforms like Nexaesports Marketplace</li>
        <li>✓ Use escrow services for all transactions</li>
        <li>✓ Verify buyer identity and reputation</li>
        <li>✓ Document all communications</li>
        <li>✓ Never provide credentials until payment is secured</li>
        <li>✓ Remove all linked payment methods before transfer</li>
      </ul>

      <h3>For Buyers:</h3>
      <ul>
        <li>✓ Check seller verification status and reviews</li>
        <li>✓ Verify account details match the listing</li>
        <li>✓ Use platform escrow - never direct payment</li>
        <li>✓ Test account access before confirming receipt</li>
        <li>✓ Change all credentials immediately</li>
        <li>✓ Report suspicious behavior to platform support</li>
      </ul>

      <div class="callout callout-tip">
        <strong>Pro Tip:</strong> On Nexaesports, verified "Nexa Player" sellers undergo rigorous identity checks. Look for the verified badge for added security.
      </div>

      <h2>Red Flags to Watch For</h2>
      <ul>
        <li>🚩 Seller refuses to use platform escrow</li>
        <li>🚩 Prices significantly below market value</li>
        <li>🚩 Rushed transactions or "limited time" pressure</li>
        <li>🚩 Requests for payment outside the platform</li>
        <li>🚩 No verification or reputation history</li>
        <li>🚩 Poor communication or vague answers</li>
      </ul>

      <h2>Why Nexaesports Marketplace is Different</h2>
      <p>Our platform implements multiple security layers:</p>
      <ul>
        <li><strong>Mandatory Escrow:</strong> All payments held until buyer confirms delivery</li>
        <li><strong>Identity Verification:</strong> Verified sellers undergo background checks</li>
        <li><strong>Dispute Resolution:</strong> Professional support team handles conflicts</li>
        <li><strong>Transaction Monitoring:</strong> AI-powered fraud detection</li>
        <li><strong>Secure Payments:</strong> Encrypted payment processing</li>
      </ul>

      <div class="callout callout-info">
        <strong>Platform Protection:</strong> Nexaesports protects both buyers and sellers with comprehensive insurance and dispute resolution services.
      </div>

      <h2>Legal Considerations</h2>
      <p>While account trading is common, be aware of game publisher terms of service. Always:</p>
      <ul>
        <li>Understand the risks involved</li>
        <li>Use legitimate platforms only</li>
        <li>Keep records of all transactions</li>
        <li>Report fraudulent activities</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Safe account trading requires vigilance, patience, and using trusted platforms. Never let excitement override caution. The few extra minutes spent verifying a transaction can save you from significant losses.</p>

      <p>Ready to trade safely? Visit the <a href="/marketplace-info">Nexaesports Marketplace</a> to learn more about our security features, or <a href="/auth/signup">create an account</a> to start trading with confidence.</p>
    `,
  },
  'tournament-highlights-january': {
    title: 'Nexaesports Tournament Highlights: Epic Moments from January',
    category: 'Tournaments',
    author: 'NeXa_ClanMaster',
    authorBio: 'Nexaesports Clan Master and tournament organizer with 5+ years in competitive gaming.',
    readTime: '6 min read',
    date: '2026-01-02',
    image: '/placeholder.svg',
    content: `
      <h2>January 2026: A Month of Epic Competition</h2>
      <p>Our January tournament series delivered some of the most intense and memorable moments in Nexaesports history. From incredible clutches to strategic masterclasses, here are the highlights.</p>

      <h2>Week 1: The Comeback Kings</h2>
      <p>Team NeXa_Alpha faced a seemingly impossible 0-4 deficit in Search & Destroy against Team Phoenix. What happened next became legendary...</p>

      <div class="callout callout-tip">
        <strong>Key Moment:</strong> Round 5 - NeXa_Striker's 1v4 clutch with only a pistol turned the tide completely. The crowd went wild as each opponent fell in quick succession.
      </div>

      <h3>Match Statistics:</h3>
      <ul>
        <li>Final Score: 5-4 (NeXa_Alpha victory)</li>
        <li>Total Kills: 48</li>
        <li>Clutch Rounds: 3</li>
        <li>MVP: NeXa_Striker (32 kills, 2.1 K/D)</li>
      </ul>

      <h2>Week 2: Strategic Perfection</h2>
      <p>The Domination match on Crossfire showcased tactical gameplay at its finest. Team NeXa_Tactical demonstrated why map control wins games.</p>

      <h2>Week 3: Battle Royale Madness</h2>
      <p>Our 20-squad BR tournament featured non-stop action across multiple zones. The final circle came down to positioning and resource management.</p>

      <div class="callout callout-info">
        <strong>Tournament Note:</strong> This was our first BR tournament with a prize pool exceeding ₦500,000, attracting top-tier players from across the region.
      </div>

      <h2>Player Spotlight: Rising Stars</h2>
      <p>Several new members proved their worth this month:</p>
      <ul>
        <li><strong>NeXa_Phoenix:</strong> Rookie sensation with 2.8 K/D average</li>
        <li><strong>NeXa_Shadow:</strong> Sniper specialist with 85% accuracy</li>
        <li><strong>NeXa_Blaze:</strong> Support player with crucial objective captures</li>
      </ul>

      <h2>Community Highlights</h2>
      <p>Beyond competitive matches, our community showed incredible spirit:</p>
      <ul>
        <li>150+ members participated in practice scrims</li>
        <li>Record-breaking viewership on our streams</li>
        <li>Successful charity fundraising tournament</li>
        <li>New training programs launched</li>
      </ul>

      <h2>Looking Ahead: February Tournament Preview</h2>
      <p>Next month brings even bigger competitions with enhanced prize pools and special guest appearances from professional players.</p>

      <div class="callout callout-warning">
        <strong>Registration Open:</strong> Spots for February tournaments are filling fast. Register now to secure your team's position.
      </div>

      <h2>Conclusion</h2>
      <p>January 2026 set new standards for competitive excellence at Nexaesports. Every player who participated contributed to these memorable moments.</p>

      <p>Want to be part of future tournaments? <a href="/auth/signup">Join Nexaesports</a> today and start your competitive journey. Check our <a href="/blog">blog regularly</a> for tournament announcements and strategy guides.</p>
    `,
  },
};

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<any>(null);
  const [tableOfContents, setTableOfContents] = useState<{ id: string; text: string; level: number }[]>([]);

  useEffect(() => {
    if (slug && blogPosts[slug]) {
      setPost(blogPosts[slug]);

      // Generate table of contents from headings
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = blogPosts[slug].content;
      const headings = tempDiv.querySelectorAll('h2, h3');
      const toc = Array.from(headings).map((heading, index) => ({
        id: `heading-${index}`,
        text: heading.textContent || '',
        level: parseInt(heading.tagName.charAt(1)),
      }));
      setTableOfContents(toc);
    } else {
      navigate('/blog');
    }
  }, [slug, navigate]);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = post?.title || '';

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast({
          title: 'Link Copied!',
          description: 'Post URL copied to clipboard',
        });
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    // Add IDs to headings for table of contents navigation
    if (post) {
      const contentElement = document.querySelector('.blog-content');
      if (contentElement) {
        const headings = contentElement.querySelectorAll('h2, h3');
        headings.forEach((heading, index) => {
          heading.id = `heading-${index}`;
        });
      }
    }
  }, [post]);

  if (!post) {
    return null;
  }

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

      {/* Breadcrumbs */}
      <div className="relative z-10 px-6 py-4 bg-card/20 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm font-rajdhani">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">
            Blog
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{post.title}</span>
        </div>
      </div>

      {/* Article Header */}
      <article className="relative z-10 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to="/blog">
            <Button variant="ghost" className="mb-6 font-rajdhani hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <Badge className="mb-4 bg-primary/20 text-primary border border-primary/30 font-rajdhani font-bold">
              {post.category}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-orbitron font-black mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-rajdhani mb-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(post.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime}</span>
              </div>
            </div>

            {/* Social Share */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground font-rajdhani font-bold">Share:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare('twitter')}
                  className="hover:bg-primary/10 hover:border-primary/50"
                >
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare('facebook')}
                  className="hover:bg-primary/10 hover:border-primary/50"
                >
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare('linkedin')}
                  className="hover:bg-primary/10 hover:border-primary/50"
                >
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare('copy')}
                  className="hover:bg-primary/10 hover:border-primary/50"
                >
                  <Link2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Table of Contents */}
          {tableOfContents.length > 0 && (
            <Card className="mb-8 bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg font-orbitron flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Table of Contents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tableOfContents.map((item, index) => (
                    <li
                      key={index}
                      className={`${item.level === 3 ? 'ml-4' : ''}`}
                    >
                      <button
                        onClick={() => scrollToHeading(item.id)}
                        className="text-left hover:text-primary transition-colors font-rajdhani text-sm hover:underline"
                      >
                        {item.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Article Content */}
          <div
            className="blog-content prose prose-invert max-w-none font-rajdhani text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <Separator className="my-12" />

          {/* Author Bio */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-orbitron mb-2">About {post.author}</CardTitle>
                  <p className="text-muted-foreground font-rajdhani">{post.authorBio}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Call to Action */}
          <div className="mt-12 text-center p-8 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-2xl backdrop-blur-sm">
            <h3 className="text-2xl font-orbitron font-bold mb-4">
              Ready to Join the <span className="text-primary">Elite</span>?
            </h3>
            <p className="text-muted-foreground font-rajdhani mb-6">
              Become part of Nexaesports and access exclusive training, tournaments, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/signup">
                <Button size="lg" className="nexa-button font-rajdhani font-black">
                  <Shield className="w-5 h-5 mr-2" />
                  Join Nexaesports
                </Button>
              </Link>
              <Link to="/blog">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-primary/50 hover:bg-primary/10 hover:border-primary font-rajdhani font-bold"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  More Articles
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>

      <style>{`
        .blog-content h2 {
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 2rem;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          color: hsl(var(--foreground));
        }

        .blog-content h3 {
          font-family: 'Orbitron', sans-serif;
          font-weight: 600;
          font-size: 1.5rem;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: hsl(var(--foreground));
        }

        .blog-content h4 {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }

        .blog-content p {
          margin-bottom: 1.25rem;
          line-height: 1.8;
          color: hsl(var(--muted-foreground));
        }

        .blog-content ul, .blog-content ol {
          margin-bottom: 1.25rem;
          padding-left: 1.5rem;
        }

        .blog-content li {
          margin-bottom: 0.5rem;
          color: hsl(var(--muted-foreground));
        }

        .blog-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
          transition: opacity 0.2s;
        }

        .blog-content a:hover {
          opacity: 0.8;
        }

        .blog-content .callout {
          padding: 1.5rem;
          border-radius: 0.75rem;
          margin: 2rem 0;
          border-left: 4px solid;
          backdrop-filter: blur(10px);
        }

        .blog-content .callout-tip {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgb(34, 197, 94);
        }

        .blog-content .callout-warning {
          background: rgba(234, 179, 8, 0.1);
          border-color: rgb(234, 179, 8);
        }

        .blog-content .callout-info {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgb(59, 130, 246);
        }

        .blog-content .callout strong {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .blog-content code {
          background: hsl(var(--card));
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
};
