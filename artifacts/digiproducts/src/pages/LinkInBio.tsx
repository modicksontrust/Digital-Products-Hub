import { useEffect, useMemo, useRef, useState } from "react";
import { setNavigationGuard } from "@/lib/navigationGuard";
import {
  useGetBio,
  useGetBioAnalytics,
  useUpdateBioSettings,
  useCreateBioLink,
  useUpdateBioLink,
  useDeleteBioLink,
  useReorderBioLinks,
  useGetProducts,
  useUpdateSellSettings,
  getGetBioQueryKey,
  getGetProductsQueryKey,
  type BioLink,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { BioPreview, BIO_THEMES, type BioPreviewData } from "@/components/BioPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  ExternalLink,
  Link2,
  Eye,
  MousePointerClick,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImageIcon,
  Palette,
  Settings2,
} from "lucide-react";
import { socialIconFor } from "@/components/BioPreview";
import { useUpload } from "@workspace/object-storage-web";
const SOCIAL_PLATFORMS = [
  "instagram",
  "twitter",
  "youtube",
  "tiktok",
  "facebook",
  "linkedin",
  "whatsapp",
  "website",
];

const THEME_CATEGORIES = {
  all: "All templates",
  light: "Light",
  dark: "Dark",
  colorful: "Colorful",
} as const;

const THEME_CATEGORY_BY_KEY: Record<string, keyof typeof THEME_CATEGORIES> = {
  noir: "dark",
  cream: "light",
  ocean: "colorful",
  sunset: "colorful",
};

const THEME_DESCRIPTIONS: Record<string, string> = {
  noir: "Editorial and high contrast",
  cream: "Warm and minimal",
  ocean: "Bright and confident",
  sunset: "Expressive and energetic",
};

type AvatarPosition = "top" | "center" | "bottom";
type LinkStyle = "rounded" | "pill" | "minimal";
type LinkDraft = { title: string; url: string };

interface ProductRow {
  id: string;
  title: string;
  slug?: string | null;
  published: boolean;
  showOnBio?: boolean;
  priceCents?: number | null;
  pricingMode?: string | null;
  currency?: string | null;
  saleShortDescription?: string | null;
  coverConfig?: { imageUrl?: string } | null;
}

export default function LinkInBio() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useGetBio();
  const { data: analytics } = useGetBioAnalytics({
    query: { refetchInterval: 30_000 },
  });
  const { data: products } = useGetProducts();
  const updateSettings = useUpdateBioSettings();
  const createLink = useCreateBioLink();
  const updateLink = useUpdateBioLink();
  const deleteLink = useDeleteBioLink();
  const reorderLinks = useReorderBioLinks();
  const updateSell = useUpdateSellSettings();

  // Local editable copy of settings
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setTheme] = useState("noir");
  const [published, setPublished] = useState(true);
  const [showProducts, setShowProducts] = useState(true);
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [themeFilter, setThemeFilter] = useState<keyof typeof THEME_CATEGORIES>("all");
  const [avatarPosition, setAvatarPosition] = useState<AvatarPosition>("center");
  const [linkStyle, setLinkStyle] = useState<LinkStyle>("rounded");
  const [linkDrafts, setLinkDrafts] = useState<Record<string, LinkDraft>>({});
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [savingLinkId, setSavingLinkId] = useState<string | null>(null);
  const [productsExpanded, setProductsExpanded] = useState(true);
  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // New link form
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const hasUnsavedLinkDrafts = Object.keys(linkDrafts).length > 0;

  useEffect(() => {
    if (data && !loaded) {
      const s = data.settings;
      setSlug(s.slug);
      setDisplayName(s.displayName);
      setBio(s.bio);
      setAvatarUrl(s.avatarUrl ?? "");
      setTheme(s.theme);
      setPublished(s.published);
      setShowProducts(s.showProducts);
      setSocialLinks(s.socialLinks);
      setLoaded(true);
    }
  }, [data, loaded]);

  const markDirty = () => setDirty(true);
  const { uploadFile: uploadAvatarFile, isUploading: isUploadingAvatar } = useUpload({
    basePath: `${import.meta.env.BASE_URL}api/bio/avatar`,
  });

  // Protect unsaved settings from being lost via tab close or in-app navigation.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty || hasUnsavedLinkDrafts;
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    setNavigationGuard(async () => {
      if (!dirtyRef.current) return true;
      return window.confirm("You have unsaved bio changes. Leave without saving?");
    });
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      setNavigationGuard(null);
    };
  }, []);

  const bioProducts = useMemo(
    () =>
      ((products as ProductRow[] | undefined) ?? []).filter(
        (p) => p.published && p.showOnBio && p.slug,
      ),
    [products],
  );
  const linkClicks = useMemo(
    () =>
      new Map(
        (analytics?.linkClicks ?? []).map((link) => [link.linkId, link.clicks]),
      ),
    [analytics],
  );

  const avatarPreviewUrl = avatarUrl.startsWith("/objects/")
    ? `${import.meta.env.BASE_URL}api/storage${avatarUrl}`
    : avatarUrl;

  const visibleThemes = Object.entries(BIO_THEMES).filter(
    ([key]) => themeFilter === "all" || THEME_CATEGORY_BY_KEY[key] === themeFilter,
  );

  const getLinkDraft = (link: BioLink): LinkDraft =>
    linkDrafts[link.id] ?? { title: link.title, url: link.url };

  const setLinkDraft = (link: BioLink, next: Partial<LinkDraft>) => {
    setLinkDrafts((previous) => ({
      ...previous,
      [link.id]: { ...getLinkDraft(link), ...next },
    }));
    setEditingLinkId(link.id);
  };

  const saveLink = (link: BioLink) => {
    const draft = getLinkDraft(link);
    if (!draft.title.trim() || !draft.url.trim()) return;
    setSavingLinkId(link.id);
    updateLink.mutate(
      { id: link.id, data: { title: draft.title.trim(), url: draft.url.trim() } },
      {
        onSuccess: (updatedLink) => {
          qc.setQueryData<typeof data>(getGetBioQueryKey(), (current) =>
            current
              ? {
                  ...current,
                  links: current.links.map((existingLink) =>
                    existingLink.id === updatedLink.id ? updatedLink : existingLink,
                  ),
                }
              : current,
          );
          setEditingLinkId(null);
          setSavingLinkId(null);
          setLinkDrafts((previous) => {
            const next = { ...previous };
            delete next[link.id];
            return next;
          });
          toast({ title: "Link updated" });
        },
        onError: (error) => {
          setSavingLinkId(null);
          toast({
            title: "Couldn't update link",
            description: error instanceof Error ? error.message : "Please check the title and URL.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const previewData: BioPreviewData = {
    displayName,
    bio,
    avatarUrl: avatarPreviewUrl || null,
    avatarPosition,
    theme,
    linkStyle,
    socialLinks: socialLinks.filter((s) => s.url.trim()),
    links: (data?.links ?? [])
      .filter((l) => l.active)
      .map((link) => ({ ...link, ...linkDrafts[link.id] })),
    products: showProducts
      ? bioProducts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          priceCents: p.priceCents,
          pricingMode: p.pricingMode,
          currency: p.currency,
          saleShortDescription: p.saleShortDescription,
          coverImageUrl: p.coverConfig?.imageUrl
            ? `${import.meta.env.BASE_URL}api/public/sales-page/${p.slug}/cover`
            : null,
        }))
      : [],
  };

  const publicUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/b/${slug}`;

  const handleSave = async () => {
    try {
      const result = await updateSettings.mutateAsync({
        slug: slug.trim().toLowerCase() || undefined,
        displayName,
        bio,
        avatarUrl: avatarUrl.trim() || null,
        theme: theme as "noir" | "cream" | "ocean" | "sunset",
        published,
        showProducts,
        socialLinks: socialLinks.filter((s) => s.url.trim()),
      });
      // Reconcile local state with what the server actually saved.
      const s = result.settings;
      setSlug(s.slug);
      setDisplayName(s.displayName);
      setBio(s.bio);
      setAvatarUrl(s.avatarUrl ?? "");
      setTheme(s.theme);
      setPublished(s.published);
      setShowProducts(s.showProducts);
      setSocialLinks(s.socialLinks);
      setDirty(false);
      toast({ title: "Bio page saved" });
    } catch (e) {
      toast({
        title: "Couldn't save",
        description: e instanceof Error ? e.message : "Please check your inputs.",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Choose an image file",
        description: "Your avatar must be a photo or other image file.",
        variant: "destructive",
      });
      return;
    }

    const upload = await uploadAvatarFile(file);
    if (!upload) return;

    try {
      await updateSettings.mutateAsync({ avatarUrl: upload.objectPath });
      setAvatarUrl(upload.objectPath);
      toast({ title: "Avatar uploaded" });
    } catch (error) {
      toast({
        title: "Couldn't save avatar",
        description:
          error instanceof Error ? error.message : "Please try uploading again.",
        variant: "destructive",
      });
    }
  };

  const handleAddLink = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    try {
      await createLink.mutateAsync({ title: newTitle.trim(), url: newUrl.trim() });
      setNewTitle("");
      setNewUrl("");
    } catch (e) {
      toast({
        title: "Couldn't add link",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  const moveLink = (index: number, dir: -1 | 1) => {
    const links = data?.links ?? [];
    const target = index + dir;
    if (target < 0 || target >= links.length) return;
    const ids = links.map((l) => l.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved!);
    reorderLinks.mutate(ids);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Couldn't copy", description: publicUrl });
    }
  };

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#B8863B]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Link in Bio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              One page for all your links and products.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyUrl} data-testid="button-copy-bio-url">
              <Copy className="w-4 h-4 mr-1.5" /> Copy link
            </Button>
            <Button variant="outline" size="sm" asChild data-testid="link-open-bio-page">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" /> Open
              </a>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateSettings.isPending}
              data-testid="button-save-bio"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              {dirty ? "Save changes" : "Save"}
            </Button>
          </div>
        </div>

        <div
          className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3"
          data-testid="bio-analytics"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Page views</span>
            <span className="text-sm font-semibold" data-testid="text-bio-page-views">
              {(analytics?.pageViews ?? 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            All-time totals. Visitor details are not collected.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Settings column */}
          <div className="space-y-6">
            {/* Profile */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bio-display-name">Display name</Label>
                    <Input
                      id="bio-display-name"
                      value={displayName}
                      onChange={(e) => { setDisplayName(e.target.value); markDirty(); }}
                      placeholder="Your name"
                      data-testid="input-bio-display-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bio-slug">Page URL</Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">/b/</span>
                      <Input
                        id="bio-slug"
                        value={slug}
                        onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); markDirty(); }}
                        placeholder="your-name"
                        data-testid="input-bio-slug"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio-text">Bio</Label>
                  <Textarea
                    id="bio-text"
                    value={bio}
                    onChange={(e) => { setBio(e.target.value); markDirty(); }}
                    placeholder="Tell people what you do"
                    maxLength={300}
                    rows={3}
                    data-testid="input-bio-text"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="bio-avatar">Profile photo</Label>
                    <span className="text-xs text-muted-foreground">Optional, but recommended</span>
                  </div>
                  <div className="flex flex-col gap-4 rounded-xl border border-dashed bg-muted/20 p-4 sm:flex-row sm:items-center">
                    <Avatar className="h-20 w-20 shrink-0 border-4 border-background shadow-sm">
                      {avatarPreviewUrl ? (
                        <AvatarImage
                          src={avatarPreviewUrl}
                          alt={displayName || "Profile"}
                          className="object-cover"
                          style={{ objectPosition: avatarPosition }}
                        />
                      ) : null}
                      <AvatarFallback className="bg-brand-100 text-lg font-semibold text-brand-700">
                        {displayName
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((word) => word[0]?.toUpperCase())
                          .join("") || "You"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Make your page recognizable</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Use a clear headshot, logo, or image that represents your work.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          ref={avatarInputRef}
                          id="bio-avatar-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleAvatarUpload}
                          data-testid="input-bio-avatar-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar || updateSettings.isPending}
                          data-testid="button-upload-bio-avatar"
                        >
                          {isUploadingAvatar ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="mr-1.5 h-4 w-4" />
                          )}
                          {isUploadingAvatar ? "Uploading…" : avatarPreviewUrl ? "Replace photo" : "Upload photo"}
                        </Button>
                        {avatarPreviewUrl ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <Check className="h-3.5 w-3.5" /> Photo ready
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Input
                    id="bio-avatar"
                    value={avatarUrl.startsWith("/objects/") ? "" : avatarUrl}
                    onChange={(e) => { setAvatarUrl(e.target.value); markDirty(); }}
                    placeholder="https://..."
                    aria-label="Avatar image URL"
                    data-testid="input-bio-avatar"
                  />
                  {avatarUrl.startsWith("/objects/") ? (
                    <p className="text-xs text-muted-foreground">
                      A photo from your device is saved for this avatar. Paste a URL above to replace it.
                    </p>
                  ) : null}
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium">Photo placement</p>
                      <span className="ml-auto text-[10px] text-muted-foreground">Preview only</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["top", "center", "bottom"] as AvatarPosition[]).map((position) => (
                        <button
                          key={position}
                          type="button"
                          onClick={() => setAvatarPosition(position)}
                          className={`rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                            avatarPosition === position
                              ? "border-brand-500 bg-brand-50 text-brand-700"
                              : "border-transparent bg-background text-muted-foreground hover:border-ink-200"
                          }`}
                          aria-pressed={avatarPosition === position}
                          data-testid={`button-avatar-position-${position}`}
                        >
                          {position}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Page is live</p>
                    <p className="text-xs text-muted-foreground">
                      Turn off to hide your public bio page.
                    </p>
                  </div>
                  <Switch
                    checked={published}
                    onCheckedChange={(v) => { setPublished(v); markDirty(); }}
                    data-testid="switch-bio-published"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Theme */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Choose a template</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">A starting style for your public page.</p>
                  </div>
                  <Palette className="h-4 w-4 text-brand-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2" aria-label="Template categories">
                  {Object.entries(THEME_CATEGORIES).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setThemeFilter(key as keyof typeof THEME_CATEGORIES)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        themeFilter === key
                          ? "bg-ink-900 text-white"
                          : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                      }`}
                      aria-pressed={themeFilter === key}
                      data-testid={`button-template-filter-${key}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {visibleThemes.map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setTheme(key); markDirty(); }}
                      className={`relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all ${
                        theme === key
                          ? "border-brand-500 ring-2 ring-brand-100"
                          : "border-transparent bg-muted/30 hover:border-ink-200"
                      }`}
                      aria-pressed={theme === key}
                      data-testid={`button-theme-${key}`}
                    >
                      <div className={`h-20 rounded-lg ${t.swatch} p-3`}>
                        <div className="mx-auto h-3 w-3 rounded-full bg-white/80" />
                        <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-white/75" />
                        <div className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-white/50" />
                        <div className="mt-3 h-5 rounded-md bg-white/65" />
                      </div>
                      <div className="mt-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{t.label}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{THEME_DESCRIPTIONS[key]}</p>
                        </div>
                        {theme === key ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white" aria-label="Selected">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Social links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Social links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {socialLinks.map((s, i) => {
                  const Icon = socialIconFor(s.platform);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Select
                        value={s.platform}
                        onValueChange={(v) => {
                          setSocialLinks((prev) => prev.map((x, j) => (j === i ? { ...x, platform: v } : x)));
                          markDirty();
                        }}
                      >
                        <SelectTrigger className="w-32 flex-shrink-0" data-testid={`select-social-platform-${i}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOCIAL_PLATFORMS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={s.url}
                        onChange={(e) => {
                          setSocialLinks((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)));
                          markDirty();
                        }}
                        placeholder="https://..."
                        data-testid={`input-social-url-${i}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setSocialLinks((prev) => prev.filter((_, j) => j !== i)); markDirty(); }}
                        data-testid={`button-remove-social-${i}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
                {socialLinks.length < 8 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSocialLinks((prev) => [...prev, { platform: "instagram", url: "" }]); markDirty(); }}
                    data-testid="button-add-social"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add social link
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {/* Custom links */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Links</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Choose what people see first on your page.</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {(data.links ?? []).length} link{(data.links ?? []).length === 1 ? "" : "s"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium">Button appearance</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Preview-only styling for every link button.</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Preview only</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {([
                      ["rounded", "Rounded"],
                      ["pill", "Pill"],
                      ["minimal", "Minimal"],
                    ] as [LinkStyle, string][]).map(([style, label]) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setLinkStyle(style)}
                        className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                          linkStyle === style
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-transparent bg-background text-muted-foreground hover:border-ink-200"
                        }`}
                        aria-pressed={linkStyle === style}
                        data-testid={`button-link-style-${style}`}
                      >
                        <span className={`mx-auto block h-2 w-8 border border-current ${style === "pill" ? "rounded-full" : style === "minimal" ? "rounded-sm" : "rounded-md"}`} />
                        <span className="mt-1 block">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {(data.links ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
                    <Link2 className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">No links yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Add a destination below to start your page.</p>
                  </div>
                ) : null}
                {(data.links ?? []).map((link: BioLink, i: number) => {
                  const draft = getLinkDraft(link);
                  const isEditing = editingLinkId === link.id || !!linkDrafts[link.id];
                  const isSaving = savingLinkId === link.id;
                  return (
                    <div key={link.id} className={`rounded-xl border p-3 transition-colors ${isEditing ? "border-brand-300 bg-brand-50/30" : "bg-card"}`}>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />
                        <span className="text-xs font-semibold text-muted-foreground">Link {i + 1}</span>
                        <span
                          className="ml-auto flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"
                          data-testid={`text-bio-link-clicks-${link.id}`}
                          title="Link clicks"
                        >
                          <MousePointerClick className="h-3.5 w-3.5" />
                          {(linkClicks.get(link.id) ?? 0).toLocaleString()} clicks
                        </span>
                        <Switch
                          checked={link.active}
                          onCheckedChange={(v) => updateLink.mutate({ id: link.id, data: { active: v } })}
                          aria-label={`${link.active ? "Hide" : "Show"} ${link.title}`}
                          data-testid={`switch-link-active-${link.id}`}
                        />
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                        <div className="space-y-1">
                          <Label htmlFor={`link-title-${link.id}`} className="text-[11px] text-muted-foreground">Label</Label>
                          <Input
                            id={`link-title-${link.id}`}
                            value={draft.title}
                            onFocus={() => setEditingLinkId(link.id)}
                            onChange={(event) => setLinkDraft(link, { title: event.target.value })}
                            maxLength={80}
                            disabled={isSaving}
                            data-testid={`input-link-title-${link.id}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`link-url-${link.id}`} className="text-[11px] text-muted-foreground">Destination URL</Label>
                          <div className="relative">
                            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id={`link-url-${link.id}`}
                              value={draft.url}
                              onFocus={() => setEditingLinkId(link.id)}
                              onChange={(event) => setLinkDraft(link, { url: event.target.value })}
                              className="pl-8"
                              inputMode="url"
                            disabled={isSaving}
                              data-testid={`input-link-url-${link.id}`}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Move up"
                            disabled={isSaving || i === 0 || reorderLinks.isPending}
                            onClick={() => moveLink(i, -1)}
                            data-testid={`button-link-up-${link.id}`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Move down"
                            disabled={isSaving || i === (data.links ?? []).length - 1 || reorderLinks.isPending}
                            onClick={() => moveLink(i, 1)}
                            data-testid={`button-link-down-${link.id}`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isSaving}
                            onClick={() => deleteLink.mutate(link.id)}
                            data-testid={`button-delete-link-${link.id}`}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          disabled={
                            isSaving ||
                            updateLink.isPending ||
                            !draft.title.trim() ||
                            !draft.url.trim() ||
                            (!linkDrafts[link.id] && !isEditing)
                          }
                          onClick={() => saveLink(link)}
                          data-testid={`button-save-link-${link.id}`}
                        >
                          {updateLink.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                          Save link
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Link title"
                    data-testid="input-new-link-title"
                  />
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    data-testid="input-new-link-url"
                  />
                  <Button
                    onClick={handleAddLink}
                    disabled={createLink.isPending || !newTitle.trim() || !newUrl.trim()}
                    data-testid="button-add-link"
                  >
                    {createLink.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1.5" />
                    )}
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader className="pb-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setProductsExpanded((expanded) => !expanded)}
                  aria-expanded={productsExpanded}
                  data-testid="button-toggle-bio-products"
                >
                  <div>
                    <CardTitle className="text-base">Products</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Feature published products right below your links.
                    </p>
                  </div>
                  {productsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
              </CardHeader>
              {productsExpanded ? <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Show products section</p>
                    <p className="text-xs text-muted-foreground">
                      Published products marked "Show on bio" appear on your page.
                    </p>
                  </div>
                  <Switch
                    checked={showProducts}
                    onCheckedChange={(v) => { setShowProducts(v); markDirty(); }}
                    data-testid="switch-show-products"
                  />
                </div>
                <div className="space-y-2">
                {((products as ProductRow[] | undefined) ?? [])
                  .filter((p) => p.published && p.slug)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.showOnBio ? "Visible on your bio page" : "Hidden from your bio page"}
                        </p>
                      </div>
                      <Switch
                        checked={p.showOnBio ?? false}
                        onCheckedChange={async (v) => {
                          try {
                            await updateSell.mutateAsync({ productId: p.id, data: { showOnBio: v } });
                            qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
                          } catch {
                            toast({ title: "Couldn't update product", variant: "destructive" });
                          }
                        }}
                        data-testid={`switch-product-bio-${p.id}`}
                      />
                    </div>
                  ))}
                </div>
                {((products as ProductRow[] | undefined) ?? []).filter((p) => p.published && p.slug).length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-5 text-center">
                    <p className="text-sm font-medium">No products ready to feature</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Publish a product in Sell → Products, then choose to show it here.
                    </p>
                  </div>
                ) : null}
              </CardContent> : null}
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOptionalExpanded((expanded) => !expanded)}
                  aria-expanded={optionalExpanded}
                  data-testid="button-toggle-bio-optional-content"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-brand-600" />
                    <div>
                      <CardTitle className="text-base">More ways to grow</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Optional content blocks for a future release.</p>
                    </div>
                  </div>
                  {optionalExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
              </CardHeader>
              {optionalExpanded ? (
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ["Email capture", "Collect sign-ups directly from your page."],
                      ["Bookings", "Let visitors request time with you."],
                      ["Featured collections", "Group related links into a focused section."],
                    ].map(([title, description]) => (
                      <div key={title} className="rounded-lg border bg-muted/20 p-3">
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">Coming soon</span>
                        <p className="mt-3 text-sm font-medium">{title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              ) : null}
            </Card>
          </div>

          {/* Phone preview */}
          <div className="order-first lg:order-none lg:sticky lg:top-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 text-center">
              Live preview
            </p>
            <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[2.2rem] border-[10px] border-[#20242E] bg-[#20242E] shadow-xl">
              <div className="h-[500px] overflow-y-auto rounded-[1.6rem] bg-white sm:h-[560px]">
                <BioPreview
                  data={previewData}
                  compact
                  productHref={(s) => `${import.meta.env.BASE_URL.replace(/\/$/, "")}/p/${s}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
