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
} from "lucide-react";
import { socialIconFor } from "@/components/BioPreview";

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
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // New link form
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

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

  // Protect unsaved settings from being lost via tab close or in-app navigation.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
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

  const previewData: BioPreviewData = {
    displayName,
    bio,
    avatarUrl: avatarUrl || null,
    theme,
    socialLinks: socialLinks.filter((s) => s.url.trim()),
    links: (data?.links ?? []).filter((l) => l.active),
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
      <div className="max-w-6xl mx-auto">
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

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
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
                <div className="space-y-1.5">
                  <Label htmlFor="bio-avatar">Avatar image URL (optional)</Label>
                  <Input
                    id="bio-avatar"
                    value={avatarUrl}
                    onChange={(e) => { setAvatarUrl(e.target.value); markDirty(); }}
                    placeholder="https://..."
                    data-testid="input-bio-avatar"
                  />
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
                <CardTitle className="text-base">Theme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(BIO_THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setTheme(key); markDirty(); }}
                      className={`rounded-xl border-2 p-2 transition-colors ${
                        theme === key ? "border-[#B8863B]" : "border-transparent hover:border-muted"
                      }`}
                      data-testid={`button-theme-${key}`}
                    >
                      <div className={`h-16 rounded-lg ${t.swatch}`} />
                      <p className="text-xs font-medium mt-1.5 text-center">{t.label}</p>
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
                <CardTitle className="text-base">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data.links ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No links yet. Add your first one below.</p>
                ) : null}
                {(data.links ?? []).map((link: BioLink, i: number) => (
                  <div key={link.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={i === 0 || reorderLinks.isPending}
                        onClick={() => moveLink(i, -1)}
                        data-testid={`button-link-up-${link.id}`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={i === (data.links ?? []).length - 1 || reorderLinks.isPending}
                        onClick={() => moveLink(i, 1)}
                        data-testid={`button-link-down-${link.id}`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{link.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <span
                      className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"
                      data-testid={`text-bio-link-clicks-${link.id}`}
                      title="Link clicks"
                    >
                      <MousePointerClick className="h-3.5 w-3.5" />
                      {(linkClicks.get(link.id) ?? 0).toLocaleString()}
                    </span>
                    <Switch
                      checked={link.active}
                      onCheckedChange={(v) => updateLink.mutate({ id: link.id, data: { active: v } })}
                      data-testid={`switch-link-active-${link.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLink.mutate(link.id)}
                      data-testid={`button-delete-link-${link.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
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
                <CardTitle className="text-base">Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                {((products as ProductRow[] | undefined) ?? [])
                  .filter((p) => p.published && p.slug)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <p className="text-sm font-medium truncate mr-3">{p.title}</p>
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
                {((products as ProductRow[] | undefined) ?? []).filter((p) => p.published && p.slug).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No published products yet. Publish a product in Sell → Products to feature it here.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Phone preview */}
          <div className="lg:sticky lg:top-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 text-center">
              Live preview
            </p>
            <div className="mx-auto w-[300px] rounded-[2.2rem] border-[10px] border-[#20242E] shadow-xl overflow-hidden bg-[#20242E]">
              <div className="h-[560px] overflow-y-auto rounded-[1.6rem] bg-white">
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
