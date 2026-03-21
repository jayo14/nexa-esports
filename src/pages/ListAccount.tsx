import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Upload, 
  Shield, 
  Gamepad2, 
  DollarSign, 
  Info, 
  CheckCircle2, 
  Video,
  X,
  Plus,
  Globe,
  Lock,
} from 'lucide-react';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'nexa-esports-default-secure-key-2026';

const ASSET_OPTIONS = [
  { id: 'mythic_gun', label: 'Mythic Gun' },
  { id: 'mythic_gun_maxed', label: 'Mythic Gun (Maxed)' },
  { id: 'mythic_skin', label: 'Mythic Skin' },
  { id: 'mythic_skin_maxed', label: 'Mythic Skin (Maxed)' },
  { id: 'legendary_gun', label: 'Legendary Gun' },
  { id: 'legendary_skin', label: 'Leg Skin' },
  { id: 'legendary_vehicle', label: 'Legendary Vehicle' },
];

const LOGIN_METHODS = [
  { id: 'activision', label: 'Activision', logo: '/activision_logo_white-text.png' },
  { id: 'icloud', label: 'iCloud', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg' },
  { id: 'gmail', label: 'Gmail', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg' },
  { id: 'facebook', label: 'Facebook', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg' },
  { id: 'others', label: 'Others', logo: null },
];

const REGIONS = [
  { id: 'Africa', label: 'Africa', flag: '🌍' },
  { id: 'UAE', label: 'UAE', flag: '🇦🇪' },
  { id: 'EU', label: 'EU', flag: '🇪🇺' },
  { id: 'USA', label: 'USA', flag: '🇺🇸' },
  { id: 'Others', label: 'Others', flag: '🌐' },
];

export const ListAccount: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createListing, isCreating } = useMarketplace();
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    account_uid: '',
    description: '',
    price: '',
    is_negotiable: false,
    region: '',
    refund_policy: false,
    other_login: '',
    account_credentials: '',
    security_notes: '',
  });

  const [selectedAssets, setSelectedAssets] = useState<Record<string, number>>({});
  const [selectedLogins, setSelectedLogins] = useState<Record<string, boolean>>({});
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const handleAssetChange = (id: string, checked: boolean) => {
    setSelectedAssets(prev => {
      if (checked) {
        return { ...prev, [id]: prev[id] || 1 };
      } else {
        const next = { ...prev };
        delete next[id];
        return next;
      }
    });
  };

  const handleAssetCountChange = (id: string, count: number) => {
    setSelectedAssets(prev => ({ ...prev, [id]: Math.max(1, count) }));
  };

  const handleLoginChange = (id: string, checked: boolean) => {
    setSelectedLogins(prev => ({ ...prev, [id]: checked }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Video must be under 50MB",
          variant: "destructive"
        });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let videoUrl = null;
    
    if (!formData.title.trim() || formData.title.trim().length < 5) {
      toast({
        title: "Invalid Title",
        description: "Listing title must be at least 5 characters long",
        variant: "destructive"
      });
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 20) {
      toast({
        title: "Description too short",
        description: "Please provide more details (at least 20 characters)",
        variant: "destructive"
      });
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (!formData.region) {
      toast({
        title: "Region Required",
        description: "Please select the account region",
        variant: "destructive"
      });
      return;
    }

    const assetCount = Object.values(selectedAssets).filter(Boolean).length;
    if (assetCount === 0) {
      toast({
        title: "Assets Required",
        description: "Please select at least one account asset",
        variant: "destructive"
      });
      return;
    }

    const loginMethods = Object.keys(selectedLogins).filter(k => selectedLogins[k]);
    if (loginMethods.length === 0) {
      toast({
        title: "Login Method Required",
        description: "Please select at least one login method",
        variant: "destructive"
      });
      return;
    }

    if (videoFile) {
      setIsUploadingVideo(true);
      try {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `marketplace-videos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('marketplace-assets')
          .upload(filePath, videoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('marketplace-assets')
          .getPublicUrl(filePath);
          
        videoUrl = publicUrl;
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: "Failed to upload account video",
          variant: "destructive"
        });
        setIsUploadingVideo(false);
        return;
      } finally {
        setIsUploadingVideo(false);
      }
    }

    if (!formData.account_credentials.trim()) {
      toast({
        title: "Credentials Required",
        description: "Please provide account login details. These will be encrypted and only revealed to the buyer after a successful purchase.",
        variant: "destructive"
      });
      return;
    }

    // Encrypt credentials before sending to DB
    const encryptedCredentials = CryptoJS.AES.encrypt(
      formData.account_credentials.trim(),
      ENCRYPTION_KEY
    ).toString();

    const listingPayload = {
      title: formData.title,
      account_uid: formData.account_uid,
      description: formData.description,
      price: parseFloat(formData.price),
      is_negotiable: formData.is_negotiable,
      assets: selectedAssets,
      login_methods: {
        methods: Object.keys(selectedLogins).filter(k => selectedLogins[k]),
        other: formData.other_login
      },
      region: formData.region,
      refund_policy: formData.refund_policy,
      video_url: videoUrl,
      game: 'Call Of Duty Mobile',
      account_credentials: encryptedCredentials,
      security_notes: formData.security_notes,
    };

    createListing(listingPayload, {
      onSuccess: () => {
        navigate('/marketplace');
      }
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-fade-in pb-32">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/marketplace')}
          className="rounded-full hover:bg-primary/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-orbitron font-bold">List Your Account</h1>
          <p className="text-muted-foreground font-rajdhani">Showcase your achievement to the Nexa community</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-primary/10">
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title" className="font-rajdhani font-semibold flex items-center gap-1">
                Listing Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Level 150 Legendary | 5 Mythics"
                className="font-rajdhani h-11"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="account_uid" className="font-rajdhani font-semibold flex items-center gap-1">
                Account UID <span className="text-xs text-muted-foreground ml-2">(Optional - only visible to admins/buyers)</span>
              </Label>
              <Input
                id="account_uid"
                value={formData.account_uid}
                onChange={(e) => setFormData({ ...formData, account_uid: e.target.value })}
                placeholder="Enter CODM UID"
                className="font-rajdhani h-11"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-sm font-orbitron flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-primary" />
              Game Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-black flex-shrink-0">
                <img 
                  src="https://e7.pngegg.com/pngimages/682/1000/png-clipart-call-of-duty-mobile-logo-iphone-call-of-duty-black-ops-mobile-game-call-of-duty-modern-warfare-video-game-logo.png" 
                  alt="CODM" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold font-orbitron text-lg">Call Of Duty Mobile</h3>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">PRESELECTED</Badge>
              </div>
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-sm font-orbitron flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-1">
                  Listing Price (₦) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                  <Input 
                    id="price"
                    type="number"
                    placeholder="0.00"
                    className="pl-8 h-12 font-bold text-lg"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="space-y-1">
                  <Label className="text-sm font-bold flex items-center gap-1">
                    Price Type <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">Is this price negotiable?</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${!formData.is_negotiable ? 'text-primary' : 'text-muted-foreground'}`}>FIXED</span>
                  <Switch 
                    checked={formData.is_negotiable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_negotiable: checked })}
                  />
                  <span className={`text-xs font-bold ${formData.is_negotiable ? 'text-primary' : 'text-muted-foreground'}`}>NEGOTIABLE</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-sm font-orbitron flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Region & Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Account Region <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={formData.region} 
                  onValueChange={(val) => setFormData({ ...formData, region: val })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(region => (
                      <SelectItem key={region.id} value={region.id}>
                        <span className="flex items-center gap-2">
                          <span>{region.flag}</span>
                          <span>{region.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="space-y-1">
                  <Label className="text-sm font-bold flex items-center gap-1">
                    Refund Policy <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">Do you offer refunds?</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${!formData.refund_policy ? 'text-destructive' : 'text-muted-foreground'}`}>NO</span>
                  <Switch 
                    checked={formData.refund_policy}
                    onCheckedChange={(checked) => setFormData({ ...formData, refund_policy: checked })}
                  />
                  <span className={`text-xs font-bold ${formData.refund_policy ? 'text-green-500' : 'text-muted-foreground'}`}>YES</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-sm font-orbitron flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Account Assets <span className="text-destructive">*</span>
            </CardTitle>
            <CardDescription className="font-rajdhani text-xs">Check assets and enter quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ASSET_OPTIONS.map((asset) => (
                <div 
                  key={asset.id} 
                  className={`flex flex-col gap-3 p-3 rounded-lg border transition-all ${
                    selectedAssets[asset.id] ? 'bg-primary/10 border-primary/40' : 'hover:bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id={asset.id} 
                      checked={!!selectedAssets[asset.id]}
                      onCheckedChange={(checked) => handleAssetChange(asset.id, checked as boolean)}
                    />
                    <Label 
                      htmlFor={asset.id} 
                      className="text-sm font-rajdhani cursor-pointer select-none flex-1 py-1"
                    >
                      {asset.label}
                    </Label>
                  </div>
                  
                  {selectedAssets[asset.id] !== undefined && (
                    <div className="flex items-center gap-2 pl-7 animate-in slide-in-from-left-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Count:</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={selectedAssets[asset.id]}
                        onChange={(e) => handleAssetCountChange(asset.id, parseInt(e.target.value))}
                        className="h-7 w-20 text-xs font-bold"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-sm font-orbitron flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Login Methods <span className="text-destructive">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {LOGIN_METHODS.map((method) => (
                <div 
                  key={method.id} 
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedLogins[method.id] ? 'bg-primary/10 border-primary/40 scale-105 shadow-sm' : 'hover:bg-muted/50 border-border'
                  }`}
                >
                  <Label 
                    htmlFor={`login-${method.id}`}
                    className="flex flex-col items-center gap-3 cursor-pointer w-full"
                  >
                    <div className={`h-8 w-8 flex items-center justify-center ${method.id === 'icloud' ? 'brightness-200' : ''}`}>
                      {method.logo ? (
                        <img src={method.logo} alt={method.label} className="h-full w-full object-contain" />
                      ) : (
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs font-bold font-rajdhani">{method.label}</span>
                  </Label>
                  <Checkbox 
                    id={`login-${method.id}`}
                    checked={selectedLogins[method.id] || false}
                    onCheckedChange={(checked) => handleLoginChange(method.id, checked as boolean)}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>

            {selectedLogins['others'] && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label htmlFor="other_login" className="flex items-center gap-1">
                  Specify Other Methods <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="other_login"
                  placeholder="e.g., Line, Discord..."
                  value={formData.other_login}
                  onChange={(e) => setFormData({ ...formData, other_login: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-orbitron flex items-center gap-2 text-primary">
              <Lock className="h-4 w-4" />
              Secure Account Delivery (Escrow)
            </CardTitle>
            <CardDescription className="font-rajdhani text-xs">
              These details are <span className="text-primary font-bold">encrypted</span> and will NOT be public. 
              They are only revealed to the buyer after payment is confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credentials" className="flex items-center gap-1">
                Login Credentials <span className="text-destructive">*</span>
              </Label>
              <Textarea 
                id="credentials"
                placeholder="Email: example@gmail.com&#10;Password: ********&#10;Backup Codes: 1234, 5678"
                className="font-mono text-sm min-h-[100px] border-primary/20 bg-background/50"
                value={formData.account_credentials}
                onChange={(e) => setFormData({ ...formData, account_credentials: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                <Shield className="h-3 w-3" />
                End-to-end encrypted. Our staff cannot see your password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="security_notes">Security Handover Notes</Label>
              <Input 
                id="security_notes"
                placeholder="e.g. Please change the linked email immediately"
                className="font-rajdhani"
                value={formData.security_notes}
                onChange={(e) => setFormData({ ...formData, security_notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-sm font-orbitron flex items-center gap-1">
                Description <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Describe your account in detail. Rare skins, BP tiers, special items..."
                className="min-h-[200px] font-rajdhani leading-relaxed"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-sm font-orbitron flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                Account Video
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!videoPreview ? (
                <div 
                  className="h-[200px] rounded-2xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-4 hover:bg-muted/20 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold font-rajdhani">Upload Gameplay/Showcase</p>
                    <p className="text-xs text-muted-foreground">MP4, WEBM (Max 50MB)</p>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] rounded-2xl overflow-hidden relative group bg-black">
                  <video 
                    src={videoPreview} 
                    className="w-full h-full object-contain" 
                    controls 
                  />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removeVideo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <input 
                ref={videoInputRef}
                type="file" 
                accept="video/*" 
                className="hidden" 
                onChange={handleVideoChange}
              />
            </CardContent>
          </Card>
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4">
          <Info className="h-6 w-6 text-primary flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold font-orbitron">Security & Escrow</h4>
            <p className="text-xs text-muted-foreground font-rajdhani leading-relaxed">
              By listing your account, you agree to Nexa's Escrow protection. Funds from buyers will be held securely until the account transfer is verified by the buyer or an admin. Ensure all login details provided are correct to avoid disputes.
            </p>
          </div>
        </div>

        <div className="fixed bottom-20 md:bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border flex justify-center z-50">
          <Button 
            className="w-full max-w-md h-12 font-orbitron text-lg shadow-lg shadow-primary/20"
            size="lg"
            type="submit"
            disabled={isCreating || isUploadingVideo}
          >
            {isCreating || isUploadingVideo ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-background border-t-transparent animate-spin rounded-full" />
                Processing...
              </span>
            ) : (
              'Post Listing'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
