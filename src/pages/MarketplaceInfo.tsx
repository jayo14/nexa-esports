import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import {
   Shield,
   ShoppingBag,
   CheckCircle,
   Search,
   Users,
   User,
   Star,
   Globe,
   ArrowRight,
   TrendingUp,
   Filter,
   SlidersHorizontal,
   Home,
   BookOpen,
   Award,
   Video,
   Menu,
   LayoutDashboard
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const MarketplaceInfo: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { listings, listingsLoading } = useMarketplace();
   const [searchQuery, setSearchQuery] = useState('');
   const [regionFilter, setRegionFilter] = useState('all');
   const [sortOrder, setSortOrder] = useState('newest');
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

   // Filter and sort listings
   const filteredListings = listings.filter(listing => {
      const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         listing.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = regionFilter === 'all' || listing.region === regionFilter;
      return matchesSearch && matchesRegion;
   }).sort((a, b) => {
      if (sortOrder === 'price_asc') return a.price - b.price;
      if (sortOrder === 'price_desc') return b.price - a.price;
      if (sortOrder === 'level_desc') return (b.player_level || 0) - (a.player_level || 0);
      // newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
   });

   const featuredListings = filteredListings.filter(l => l.featured).slice(0, 3);
   const displayListings = filteredListings.length > 0 ? filteredListings : [];

   const renderAssetBadges = (assets: any) => {
      if (!assets) return [];
      const premiumAssets = [
         { id: 'mythic_gun', label: 'Mythic' },
         { id: 'mythic_gun_maxed', label: 'Mythic (Max)' },
         { id: 'mythic_skin', label: 'Mythic Skin' },
         { id: 'mythic_skin_maxed', label: 'Mythic Skin (Max)' },
         { id: 'legendary_gun', label: 'Legendary' },
         { id: 'legendary_skin', label: 'Leg Skin' },
         { id: 'legendary_vehicle', label: 'Leg Vehicle' },
      ];

      return premiumAssets
         .filter(asset => !!assets[asset.id])
         .map(asset => {
            const count = assets[asset.id];
            return (
               <Badge key={asset.id} variant="outline" className="text-[10px] font-rajdhani border-primary/20 bg-primary/5 text-primary">
                  {asset.label}
                  {typeof count === 'number' && count > 1 ? ` (${count})` : ''}
               </Badge>
            );
         });
   };

   return (
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
         {/* Animated Background */}
         <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background/90" />
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse delay-1000" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
         </div>

         {/* Navigation */}
         <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/40">
            <div className="flex items-center gap-8">
               <Link to="/" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                     <img src="/nexa-logo-ramadan.jpg" alt="Logo" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <span className="font-orbitron font-bold text-lg hidden sm:block tracking-wide">
                     NEXA<span className="text-primary">MARKET</span>
                  </span>
               </Link>

               <div className="hidden md:flex items-center gap-1">
                  <Link to="/">
                     <Button variant="ghost" size="sm" className="font-rajdhani font-semibold hover:bg-primary/5">
                        <Home className="w-4 h-4 mr-2" />
                        Home
                     </Button>
                  </Link>
                  <Link to="/blog">
                     <Button variant="ghost" size="sm" className="font-rajdhani font-semibold hover:bg-primary/5">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Blog
                     </Button>
                  </Link>
               </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
               <ThemeToggle />
               {user ? (
                  <Link to="/dashboard">
                     <Button className="font-rajdhani font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                     </Button>
                  </Link>
               ) : (
                  <div className="flex items-center gap-2">
                     <Link to="/auth/login">
                        <Button variant="ghost" className="font-rajdhani font-bold hover:bg-primary/5">
                           Log In
                        </Button>
                     </Link>
                     <Link to="/auth/signup">
                        <Button className="font-rajdhani font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                           Join Now
                        </Button>
                     </Link>
                  </div>
               )}
            </div>

            {/* Mobile Menu Trigger */}
            <div className="flex md:hidden items-center gap-4">
               <ThemeToggle />
               <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                     <Button variant="ghost" size="icon">
                        <Menu className="w-6 h-6" />
                     </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="bg-background/95 backdrop-blur-xl border-l border-primary/20">
                     <SheetHeader className="mb-6">
                        <SheetTitle className="text-left font-orbitron text-xl font-bold">Menu</SheetTitle>
                     </SheetHeader>
                     <div className="flex flex-col gap-4">
                        <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                           <Button variant="ghost" className="w-full justify-start font-rajdhani text-lg">
                              <Home className="w-5 h-5 mr-3" />
                              Home
                           </Button>
                        </Link>
                        <Link to="/blog" onClick={() => setIsMobileMenuOpen(false)}>
                           <Button variant="ghost" className="w-full justify-start font-rajdhani text-lg">
                              <BookOpen className="w-5 h-5 mr-3" />
                              Blog
                           </Button>
                        </Link>

                        <div className="h-px bg-border/50 my-2" />

                        {user ? (
                           <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                              <Button className="w-full font-rajdhani font-bold bg-primary text-white">
                                 <LayoutDashboard className="w-5 h-5 mr-2" />
                                 Dashboard
                              </Button>
                           </Link>
                        ) : (
                           <>
                              <Link to="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                                 <Button variant="outline" className="w-full justify-start font-rajdhani">
                                    Log In
                                 </Button>
                              </Link>
                              <Link to="/auth/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                 <Button className="w-full font-rajdhani font-bold bg-primary text-white">
                                    Join Now
                                 </Button>
                              </Link>
                           </>
                        )}
                     </div>
                  </SheetContent>
               </Sheet>
            </div>
         </nav>

         <main className="relative z-10 pb-20">
            {/* Hero Section */}
            <section className="pt-20 pb-16 px-6 text-center lg:text-left relative overflow-hidden">
               <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                     <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold font-rajdhani tracking-wider animate-fade-in-up">
                        <Shield className="w-4 h-4" />
                        SECURE ESCROW TRADING
                     </div>

                     <h1 className="text-5xl md:text-6xl lg:text-7xl font-orbitron font-black leading-tight tracking-tight">
                        The Premier <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-400 to-orange-500 animate-gradient">
                           CODM Market
                        </span>
                     </h1>

                     <p className="text-xl text-muted-foreground font-rajdhani max-w-xl mx-auto lg:mx-0 leading-relaxed">
                        Buy and sell Call of Duty: Mobile accounts with complete confidence.
                        Verified sellers, instant delivery, and 100% money-back guarantee.
                     </p>

                     {/* Search Bar */}
                     <div className="max-w-md mx-auto lg:mx-0 relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
                        <div className="relative flex items-center bg-card border border-border/50 rounded-xl shadow-2xl p-2">
                           <Search className="w-5 h-5 text-muted-foreground ml-3" />
                           <input
                              type="text"
                              placeholder="Search for skins, ranks, or levels..."
                              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 font-rajdhani text-lg placeholder:text-muted-foreground/50"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                           />
                           <Button size="sm" className="font-rajdhani font-bold">
                              Search
                           </Button>
                        </div>
                     </div>

                     <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 pt-4">
                        <div className="flex -space-x-3">
                           {[1, 2, 3, 4].map(i => (
                              <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                                 <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                              </div>
                           ))}
                           <div className="w-10 h-10 rounded-full border-2 border-background bg-card flex items-center justify-center font-bold text-xs">
                              2k+
                           </div>
                        </div>
                        <div className="text-left">
                           <div className="flex text-yellow-500">
                              {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                           </div>
                           <p className="text-sm font-rajdhani text-muted-foreground">Trusted by 2,000+ Gamers</p>
                        </div>
                     </div>
                  </div>

                  {/* Hero Visual */}
                  <div className="relative hidden lg:block">
                     <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" />
                     <div className="relative grid grid-cols-2 gap-4">
                        {featuredListings.length > 0 ? (
                           featuredListings.map((listing, i) => (
                              <Card key={listing.id} className={`bg-card/40 backdrop-blur-md border-primary/20 transform hover:-translate-y-2 transition-all duration-500 ${i === 1 ? 'translate-y-12' : ''}`}>
                                 <div className="aspect-video bg-black/50 relative overflow-hidden rounded-t-xl">
                                    {listing.video_url ? (
                                       <video src={listing.video_url} className="w-full h-full object-cover opacity-80" autoPlay muted loop />
                                    ) : (
                                       <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                                          <ShoppingBag className="w-12 h-12 text-primary/20" />
                                       </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                       <Badge className="bg-primary/90 hover:bg-primary border-none text-[10px]">FEATURED</Badge>
                                    </div>
                                 </div>
                                 <CardContent className="p-4">
                                    <h3 className="font-orbitron font-bold truncate text-foreground">{listing.title}</h3>
                                    <p className="text-primary font-bold mt-1">₦{listing.price.toLocaleString()}</p>
                                 </CardContent>
                              </Card>
                           ))
                        ) : (
                           <div className="col-span-2 text-center py-20 bg-card/20 rounded-3xl border border-dashed border-primary/20">
                              <p className="text-muted-foreground font-rajdhani">Featured listings loading...</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </section>

            {/* Filters & Listings */}
            <section className="px-6 py-12 max-w-7xl mx-auto">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                     <h2 className="text-3xl font-orbitron font-bold flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-primary" />
                        Latest Accounts
                     </h2>
                     <p className="text-muted-foreground font-rajdhani mt-1">
                        Fresh listings from verified sellers.
                     </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                     <Select value={regionFilter} onValueChange={setRegionFilter}>
                        <SelectTrigger className="w-[140px] bg-card border-border/50 font-rajdhani">
                           <Globe className="w-4 h-4 mr-2" />
                           <SelectValue placeholder="Region" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">Global</SelectItem>
                           <SelectItem value="Africa">Africa</SelectItem>
                           <SelectItem value="EU">Europe</SelectItem>
                           <SelectItem value="USA">N. America</SelectItem>
                           <SelectItem value="Asia">Asia</SelectItem>
                        </SelectContent>
                     </Select>

                     <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-[160px] bg-card border-border/50 font-rajdhani">
                           <SlidersHorizontal className="w-4 h-4 mr-2" />
                           <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="newest">Newest First</SelectItem>
                           <SelectItem value="price_asc">Price: Low to High</SelectItem>
                           <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               {listingsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                     {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="h-[350px] bg-card/30 rounded-2xl animate-pulse" />
                     ))}
                  </div>
               ) : displayListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {displayListings.map(listing => (
                        <Card key={listing.id} className="group bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden flex flex-col">
                           {/* Image Area */}
                           <div className="aspect-[4/3] bg-black/50 relative overflow-hidden">
                              {listing.video_url ? (
                                 <video
                                    src={listing.video_url}
                                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                                    muted
                                    loop
                                    onMouseEnter={e => e.currentTarget.play()}
                                    onMouseLeave={e => {
                                       e.currentTarget.pause();
                                       e.currentTarget.currentTime = 0;
                                    }}
                                 />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-background">
                                    <ShoppingBag className="w-12 h-12 text-muted-foreground/20" />
                                 </div>
                              )}

                              {/* Overlay Tags */}
                              <div className="absolute top-3 left-3 flex flex-col gap-2">
                                 {listing.verification_status === 'verified' && (
                                    <Badge className="bg-green-500/90 text-white border-none backdrop-blur-md shadow-lg font-rajdhani">
                                       <Shield className="w-3 h-3 mr-1" /> VERIFIED
                                    </Badge>
                                 )}
                              </div>

                              <div className="absolute bottom-3 right-3">
                                 <Badge variant="secondary" className="backdrop-blur-md bg-black/50 text-white border-none font-rajdhani">
                                    <Globe className="w-3 h-3 mr-1" /> {listing.region}
                                 </Badge>
                              </div>
                           </div>

                           <CardContent className="p-4 flex-1 flex flex-col gap-3">
                              <div>
                                 <h3 className="font-orbitron font-bold text-lg truncate group-hover:text-primary transition-colors">
                                    {listing.title}
                                 </h3>
                                 <p className="text-xs text-muted-foreground font-rajdhani line-clamp-2 mt-1">
                                    {listing.description}
                                 </p>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                 {renderAssetBadges(listing.assets).slice(0, 3)}
                                 {renderAssetBadges(listing.assets).length > 3 && (
                                    <span className="text-[9px] text-muted-foreground font-rajdhani">+{renderAssetBadges(listing.assets).length - 3} more</span>
                                 )}
                              </div>

                              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
                                 <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground font-rajdhani uppercase tracking-wider">Price</span>
                                    <span className="text-xl font-orbitron font-bold text-primary">
                                       ₦{listing.price.toLocaleString()}
                                    </span>
                                 </div>
                              </div>
                           </CardContent>

                           <CardFooter className="p-4 pt-0">
                              <Link to="/auth/login" className="w-full">
                                 <Button className="w-full font-rajdhani font-bold bg-muted hover:bg-primary hover:text-white transition-colors">
                                    View Details <ArrowRight className="w-4 h-4 ml-2" />
                                 </Button>
                              </Link>
                           </CardFooter>
                        </Card>
                     ))}
                  </div>
               ) : (
                  <div className="text-center py-24 bg-card/20 rounded-3xl border border-dashed border-border">
                     <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                     </div>
                     <h3 className="text-xl font-orbitron font-bold mb-2">No listings found</h3>
                     <p className="text-muted-foreground font-rajdhani">
                        Try adjusting your filters or search query.
                     </p>
                  </div>
               )}
            </section>

            {/* Top Sellers Section */}
            <section className="px-6 py-16 bg-card/30 border-y border-border/30">
               <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-12">
                     <h2 className="text-3xl md:text-4xl font-orbitron font-bold mb-4">
                        Top Verified <span className="text-primary">Sellers</span>
                     </h2>
                     <p className="text-muted-foreground font-rajdhani max-w-2xl mx-auto">
                        Trade with our most trusted community members. High ratings, fast delivery, and premium support.
                     </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                     {[
                        { name: 'Ghost_Killer', rating: 5.0, sales: 142, img: 'https://i.pravatar.cc/150?img=60' },
                        { name: 'Viper_Sniper', rating: 4.9, sales: 98, img: 'https://i.pravatar.cc/150?img=52' },
                        { name: 'Nexa_Official', rating: 5.0, sales: 523, img: '/nexa-logo-ramadan.jpg' },
                        { name: 'Shadow_Ops', rating: 4.8, sales: 76, img: 'https://i.pravatar.cc/150?img=12' },
                     ].map((seller, i) => (
                        <div key={i} className="bg-background border border-border/50 rounded-2xl p-6 text-center hover:border-primary/50 transition-all group cursor-pointer">
                           <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-br from-primary to-transparent mb-4 group-hover:scale-105 transition-transform">
                              <img src={seller.img} alt={seller.name} className="w-full h-full rounded-full object-cover bg-black" />
                           </div>
                           <h3 className="font-orbitron font-bold text-lg mb-1 flex items-center justify-center gap-1">
                              {seller.name}
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                           </h3>
                           <div className="flex items-center justify-center gap-1 text-yellow-500 mb-3">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="font-bold text-foreground">{seller.rating}</span>
                              <span className="text-muted-foreground text-xs">({seller.sales} sales)</span>
                           </div>
                           <Button variant="outline" size="sm" className="w-full font-rajdhani">
                              View Profile
                           </Button>
                        </div>
                     ))}
                  </div>
               </div>
            </section>

            {/* CTA Section */}
            <section className="px-6 py-20">
               <div className="max-w-4xl mx-auto text-center relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative bg-card/80 backdrop-blur-xl border border-primary/20 rounded-3xl p-12 shadow-2xl">
                     <h2 className="text-4xl md:text-5xl font-orbitron font-black mb-6">
                        Ready to <span className="text-primary">Upgrade?</span>
                     </h2>
                     <p className="text-xl text-muted-foreground font-rajdhani mb-8 max-w-2xl mx-auto">
                        Join thousands of players buying and selling safely on Nexa Marketplace.
                        Create your account today and get started.
                     </p>
                     <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/auth/signup">
                           <Button size="lg" className="w-full sm:w-auto font-orbitron font-bold text-lg px-8 py-6 shadow-xl shadow-primary/20">
                              Create Free Account
                           </Button>
                        </Link>
                        <Link to="/auth/login">
                           <Button size="lg" variant="outline" className="w-full sm:w-auto font-orbitron font-bold text-lg px-8 py-6">
                              Seller Dashboard
                           </Button>
                        </Link>
                     </div>
                  </div>
               </div>
            </section>

         </main>
      </div>
   );
};