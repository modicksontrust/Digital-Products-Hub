export interface CoverStyleOption {
  key: string;
  label: string;
  description: string;
  /** Two-stop gradient used for the style-picker thumbnail swatch. */
  gradient: [string, string];
}

// Keep keys/labels in sync with artifacts/api-server/src/lib/coverStyles.ts
export const COVER_STYLE_OPTIONS: CoverStyleOption[] = [
  { key: "split_diagonal_departure", label: "Split Diagonal Departure", description: "Bold color-block diagonal", gradient: ["#1FA06B", "#06251C"] },
  { key: "premium_object_flatlay", label: "Premium Object Flatlay", description: "Overhead product photo", gradient: ["#E8DCC8", "#B8A47E"] },
  { key: "neon_route_map", label: "Neon Route Map", description: "Glowing map on dark", gradient: ["#0B0F1A", "#00E5FF"] },
  { key: "giant_number_promise", label: "Giant Number Promise", description: "Oversized numeral hero", gradient: ["#D9A02B", "#7A4E00"] },
  { key: "comic_book_pow", label: "Comic Book POW", description: "Retro comic halftones", gradient: ["#FFD400", "#E4372A"] },
  { key: "minimalist_gradient_wave", label: "Minimalist Gradient Wave", description: "Soft flowing gradient", gradient: ["#2E8B9E", "#BFE9F0"] },
  { key: "hand_drawn_sketch", label: "Hand-Drawn Sketch", description: "Warm notebook ink art", gradient: ["#F4EFE6", "#8C7A5B"] },
  { key: "bold_typography_only", label: "Bold Typography Only", description: "Type-driven, no imagery", gradient: ["#111111", "#4B4B4B"] },
  { key: "3d_render_showcase", label: "3D Render Showcase", description: "Glossy floating object", gradient: ["#D6D9E0", "#7C86A6"] },
  { key: "vintage_paper_texture", label: "Vintage Paper Texture", description: "Aged sepia + serif type", gradient: ["#EFDFB9", "#9C7A44"] },
  { key: "geometric_abstract_grid", label: "Geometric Abstract Grid", description: "Overlapping shapes", gradient: ["#7C3AED", "#F97316"] },
  { key: "silhouette_horizon", label: "Silhouette Horizon", description: "Dramatic sky silhouette", gradient: ["#FF7A59", "#2B1055"] },
  { key: "sticky_note_collage", label: "Sticky Note Collage", description: "Playful desk collage", gradient: ["#FFE28A", "#FF9F80"] },
  { key: "duotone_portrait", label: "Duotone Portrait", description: "High-contrast two-tone", gradient: ["#00B4A0", "#0A0A0A"] },
  { key: "isometric_scene", label: "Isometric Scene", description: "Miniature illustrated world", gradient: ["#A0E8CB", "#3F8E7E"] },
  { key: "brutalist_stark", label: "Brutalist Stark", description: "Raw black & white type", gradient: ["#111111", "#D64545"] },
  { key: "watercolor_wash", label: "Watercolor Wash", description: "Soft painterly bleed", gradient: ["#BFD9F2", "#F2C6D9"] },
  { key: "tech_dashboard_ui", label: "Tech Dashboard UI", description: "Data-viz motif on dark", gradient: ["#0B0F1A", "#4F7CFF"] },
  { key: "pastel_blob_shapes", label: "Pastel Blob Shapes", description: "Layered soft blobs", gradient: ["#FBCFE8", "#C7D2FE"] },
  { key: "photo_bold_overlay", label: "Photo + Bold Overlay", description: "Photo with color panel", gradient: ["#1FA06B", "#111111"] },
];
