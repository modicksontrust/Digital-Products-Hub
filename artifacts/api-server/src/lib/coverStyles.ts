export interface CoverStyle {
  key: string;
  label: string;
  description: string;
  /** Builds the image-generation prompt for this style given the book's details. */
  prompt: (book: {
    title: string;
    subtitle?: string | null;
    topic?: string | null;
    authorName?: string | null;
  }) => string;
}

const base = (book: {
  title: string;
  subtitle?: string | null;
  topic?: string | null;
  authorName?: string | null;
}) =>
  `Book title: "${book.title}".${book.subtitle ? ` Subtitle: "${book.subtitle}".` : ""}${
    book.topic ? ` Topic: ${book.topic}.` : ""
  }${book.authorName ? ` Include the author name "${book.authorName}" in smaller type on the cover.` : ""}`;

/**
 * ~20 distinct AI cover-art directions. Every prompt asks for a finished,
 * print-ready 3:4 portrait (A4 page proportions) eBook cover with the title (and subtitle, if any)
 * baked into the artwork as real typography — not a placeholder mockup.
 */
export const COVER_STYLES: CoverStyle[] = [
  {
    key: "split_diagonal_departure",
    label: "Split Diagonal Departure",
    description: "Bold diagonal color-block split with big confident type",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions). A bold diagonal line splits the cover into two contrasting flat colors. Large, confident sans-serif typography for the title is integrated cleanly into the composition. ${base(b)} Minimal, modern, high-contrast, print-ready.`,
  },
  {
    key: "premium_object_flatlay",
    label: "Premium Object Flatlay",
    description: "Overhead flat-lay of objects related to the topic",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), styled as an overhead flat-lay photograph of premium objects related to the book's subject, softly lit on a neutral surface. The title is set in elegant serif typography overlaid at the top. ${base(b)} Editorial, high-end, print-ready.`,
  },
  {
    key: "neon_route_map",
    label: "Neon Route Map",
    description: "Glowing neon map/route lines on a dark background",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), dark background with glowing neon-style route lines, nodes, and map-like paths suggesting a journey. Bold neon-outlined title typography. ${base(b)} Futuristic, energetic, print-ready.`,
  },
  {
    key: "giant_number_promise",
    label: "Giant Number Promise",
    description: "Oversized numeral as the dominant visual anchor",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), dominated by one giant stylized numeral filling most of the frame as a graphic anchor, with the title set cleanly in front of or beside it in bold type. ${base(b)} Punchy, benefit-driven, print-ready.`,
  },
  {
    key: "comic_book_pow",
    label: "Comic Book POW",
    description: "Retro comic-panel style with halftone dots and bursts",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), in a retro comic-book style with halftone dot shading, bold outlines, and an action burst shape behind the title. Comic lettering for the title. ${base(b)} Playful, high-energy, print-ready.`,
  },
  {
    key: "minimalist_gradient_wave",
    label: "Minimalist Gradient Wave",
    description: "Soft gradient background with one flowing wave shape",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), with a smooth soft-color gradient background and a single flowing organic wave shape crossing the composition. Clean modern sans-serif title typography. ${base(b)} Calm, premium, print-ready.`,
  },
  {
    key: "hand_drawn_sketch",
    label: "Hand-Drawn Sketch",
    description: "Warm, hand-illustrated sketch style with notebook texture",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), illustrated in a warm hand-drawn sketch style with subtle notebook paper texture and ink line-art elements related to the topic. Hand-lettered-look title typography. ${base(b)} Friendly, approachable, print-ready.`,
  },
  {
    key: "bold_typography_only",
    label: "Bold Typography Only",
    description: "Type-driven cover, no imagery, oversized lettering",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), entirely typography-driven with no imagery: oversized, expressive lettering for the title filling the frame on a single flat background color, using scale and weight contrast for hierarchy. ${base(b)} Confident, editorial, print-ready.`,
  },
  {
    key: "3d_render_showcase",
    label: "3D Render Showcase",
    description: "Glossy 3D-rendered hero object floating on a clean backdrop",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), featuring a glossy, softly-lit 3D-rendered object relevant to the topic floating on a clean studio backdrop with soft shadows. Modern sans-serif title typography. ${base(b)} Polished, contemporary, print-ready.`,
  },
  {
    key: "vintage_paper_texture",
    label: "Vintage Paper Texture",
    description: "Aged paper texture with classic serif typography",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), with an aged, textured paper background, subtle sepia tones, and classic ornamental serif typography for the title. ${base(b)} Timeless, literary, print-ready.`,
  },
  {
    key: "geometric_abstract_grid",
    label: "Geometric Abstract Grid",
    description: "Overlapping geometric shapes in a structured grid",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), built from overlapping geometric shapes — circles, triangles, and lines — arranged in a structured grid with a bold complementary color palette. Clean modern title typography integrated into the grid. ${base(b)} Structured, design-forward, print-ready.`,
  },
  {
    key: "silhouette_horizon",
    label: "Silhouette Horizon",
    description: "Dramatic silhouette figure or skyline against a colored sky",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), showing a dramatic silhouette (a figure or skyline relevant to the topic) against a vividly colored gradient sky horizon. Bold title typography along the top or bottom third. ${base(b)} Cinematic, aspirational, print-ready.`,
  },
  {
    key: "sticky_note_collage",
    label: "Sticky Note Collage",
    description: "Playful collage of sticky notes, tape, and doodles",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), styled as a playful flat-lay collage of sticky notes, washi tape, and small hand-drawn doodles on a corkboard or desk background, with the title written on a larger central card. ${base(b)} Casual, productivity-themed, print-ready.`,
  },
  {
    key: "duotone_portrait",
    label: "Duotone Portrait",
    description: "High-contrast two-color duotone photographic treatment",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), using a bold two-color duotone photographic treatment of a subject relevant to the topic, with strong contrast and a clean sans-serif title lockup. ${base(b)} Editorial, striking, print-ready.`,
  },
  {
    key: "isometric_scene",
    label: "Isometric Scene",
    description: "Miniature isometric illustration of a related scene",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), featuring a charming miniature isometric illustration of a scene related to the topic, in a flat vector art style with a soft color palette. Rounded modern title typography. ${base(b)} Friendly, illustrative, print-ready.`,
  },
  {
    key: "brutalist_stark",
    label: "Brutalist Stark",
    description: "Stark black-and-white brutalist layout with raw type",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), in a stark brutalist style: black-and-white (or near-monochrome) with raw, unpolished grid-based typography and one bold accent color used sparingly. ${base(b)} Edgy, confident, print-ready.`,
  },
  {
    key: "watercolor_wash",
    label: "Watercolor Wash",
    description: "Soft watercolor washes with organic bleeding edges",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), painted with soft watercolor washes and organic bleeding edges in a palette relevant to the topic, with elegant hand-finished title typography layered on top. ${base(b)} Artistic, gentle, print-ready.`,
  },
  {
    key: "tech_dashboard_ui",
    label: "Tech Dashboard UI",
    description: "Stylized dashboard/data-viz motif with charts and glow",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), featuring a stylized abstract dashboard of charts, graphs, and glowing data lines on a dark tech-themed background. Sleek modern sans-serif title typography. ${base(b)} Data-driven, modern, print-ready.`,
  },
  {
    key: "pastel_blob_shapes",
    label: "Pastel Blob Shapes",
    description: "Soft pastel organic blob shapes layered behind the title",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), with soft pastel organic blob shapes layered and overlapping behind clean, rounded modern title typography. ${base(b)} Light, approachable, print-ready.`,
  },
  {
    key: "photo_bold_overlay",
    label: "Photo + Bold Overlay",
    description: "Real photographic scene with a bold color overlay panel",
    prompt: (b) =>
      `Design a professional eBook cover, 3:4 portrait (A4 page proportions), using a realistic photographic scene relevant to the topic with a bold solid-color panel overlay holding large, high-contrast title typography. ${base(b)} Commercial, punchy, print-ready.`,
  },
];

export function getCoverStyle(key: string): CoverStyle | undefined {
  return COVER_STYLES.find((s) => s.key === key);
}
