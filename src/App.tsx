import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import profileText from "../profile.txt?raw";

type CategoryKey = "architecture" | "robotic" | "model" | "illustration" | "goods";
type ImageType = "main" | "render" | "document" | "model" | "site" | "axon" | "plan" | "section" | "diagram" | "process" | "unknown";
type DisplaySize = "l" | "m" | "s" | "xs";
type Category = { key: CategoryKey; title: { zh: string; en: string }; coverStem: string; image: string };
type PortfolioProject = {
  id: string;
  title: string;
  category: string;
  categoryKey: CategoryKey;
  year: string;
  professor?: string;
  teamMember?: string;
  cover: string;
  description: string;
  images: string[];
  infoPath?: string;
  kind?: "project" | "illustration";
};
type PortfolioData = { categories: Category[]; projectsByCategory: Record<CategoryKey, PortfolioProject[]> };
type GithubTreeEntry = { path: string; type: "blob" | "tree" };
type JsDelivrFlatResponse = { files: Array<{ name: string }> };
type PortfolioManifest = {
  categories?: Category[];
  projectsByCategory?: Partial<Record<CategoryKey, PortfolioProject[]>>;
};
type DisplayRow = { size: DisplaySize; images: string[] };

const repoOwner = "Lin-zl522";
const repoName = "portfolio-assets";
const repoBranch = "main";
const repoBase = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}`;
const cacheVersion = "20260629-1";
const cacheKey = `portfolio-assets-cache-${cacheVersion}`;
const manifestUrl = `${repoBase}/portfolio-manifest.json?v=${cacheVersion}`;
const jsdelivrUrl = `https://data.jsdelivr.com/v1/package/gh/${repoOwner}/${repoName}@${repoBranch}/flat?v=${cacheVersion}`;
const githubTreeUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${repoBranch}?recursive=1&v=${cacheVersion}`;
const assetUrl = (path: string) => `${repoBase}/${path.split("/").map(encodeURIComponent).join("/")}?v=${cacheVersion}`;
const isImageFile = (path: string) => /\.(png|jpe?g|webp|gif|avif)$/i.test(path);
const isProjectInfoFile = (path: string) => /_info\s*\.txt$/i.test(filenameFromUrl(path));
const categoryKeys: CategoryKey[] = ["architecture", "robotic", "model", "illustration", "goods"];
const categoryFolders: Record<Exclude<CategoryKey, "illustration" | "goods">, string[]> = {
  architecture: ["Architecture_"],
  robotic: ["Robotic Construction_", "Robotic_Construction_"],
  model: ["Scale Model_"],
};
const categoryNames: Record<Exclude<CategoryKey, "illustration" | "goods">, string> = {
  architecture: "Architecture",
  robotic: "Robotic Construction",
  model: "Scale Model",
};
const typeOrder: Record<ImageType, number> = {
  main: 0,
  render: 1,
  document: 1,
  model: 2,
  site: 3,
  axon: 4,
  plan: 5,
  section: 6,
  diagram: 7,
  process: 7,
  unknown: 8,
};
const rowCapacity: Record<DisplaySize, number> = { l: 1, m: 2, s: 3, xs: 4 };
const rowGap: Record<DisplaySize, number> = { l: 0, m: 32, s: 16, xs: 16 };
const galleryLayout = [
  { width: "34vw", side: "left", offset: "0px" },
  { width: "31vw", side: "right", offset: "-60px" },
  { width: "38vw", side: "left", offset: "-30px" },
  { width: "32vw", side: "right", offset: "-80px" },
  { width: "35vw", side: "left", offset: "-40px" },
  { width: "30vw", side: "right", offset: "-70px" },
] as const;
const baseCategories: Category[] = [
  { key: "architecture", title: { zh: "建筑", en: "Architecture" }, coverStem: "Architecture_cover", image: assetUrl("Architecture_cover.jpg") },
  { key: "robotic", title: { zh: "机器人建造", en: "Robotic Construction" }, coverStem: "Robotic Construction_cover", image: assetUrl("Robotic Construction_cover.jpg") },
  { key: "model", title: { zh: "实体模型", en: "Scale Model" }, coverStem: "Scale Model_cover", image: assetUrl("Scale Model_cover.png") },
  { key: "illustration", title: { zh: "插画", en: "Illustration" }, coverStem: "Illustration_cover", image: assetUrl("Illustration_cover.JPG") },
  { key: "goods", title: { zh: "产品", en: "Goods" }, coverStem: "Goods_cover", image: assetUrl("Goods_cover.JPEG") },
];
const ui = {
  logo: assetUrl("UI/预定调和_Logo_宽.png"),
  back: assetUrl("UI/UI_Back.png"),
  portrait: assetUrl("UI/头像.png"),
  font: assetUrl("UI/Sofia Pro Regular.ttf"),
  linkedin: "https://www.linkedin.com/in/zekai-lin-882641320",
  bilibili: "https://space.bilibili.com/",
  makerworld: "https://makerworld.com/zh/@iGniSPY",
  email: "zekailin522@outlook.com",
};
const copy = {
  zh: {
    name: "林 则恺",
    subname: "ZEKAI LIN",
    about: [
      "康奈尔大学建筑学学士（B.Arch），辅修游戏设计。学习方向覆盖建筑设计、结构系统、计算设计、快速原型与高级游戏设计，形成了跨建筑、产品与交互媒介的综合设计基础。",
      "具备从概念发展到视觉表达、结构推敲与实体原型制作的完整设计能力。核心技能包括参数化建模、三维建模与制图、实体模型制作、材料实验、3D 打印、CNC 加工以及数字制造流程开发。",
      "毕业设计聚焦基于 Helmholtz resonators 与 Fano-like interference 的声学结构，探索模块化低频降噪系统，并通过计算设计、几何迭代、模拟分析与实体原型验证其声学性能和建筑应用潜力。",
    ],
  },
  en: {
    name: "ZEKAI LIN",
    subname: "林 則愷",
    about: [
      "Bachelor of Architecture from Cornell University, with a minor in Game Design. Academic training spans architectural design, structural systems, computational design, rapid prototyping, and advanced game design.",
      "Skilled in concept development, visual communication, structural refinement, physical prototyping, parametric modeling, 3D modeling, drafting, material experimentation, 3D printing, CNC fabrication, and digital fabrication workflows.",
      "The thesis explores modular low-frequency noise reduction structures based on Helmholtz resonators and Fano-like interference through computational design, simulation, and physical prototyping.",
    ],
  },
} as const;

function parseProfileAbout(value: string) {
  const sections = value.replace(/\r\n?/g, "\n").split(/^\[(zh|en)\]\s*$/gm);
  const parsed: Record<"zh" | "en", string[]> = { zh: [], en: [] };
  for (let index = 1; index < sections.length; index += 2) {
    const language = sections[index].toLowerCase() as "zh" | "en";
    parsed[language] = (sections[index + 1] ?? "")
      .trim()
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }
  return {
    zh: parsed.zh.length ? parsed.zh : [...copy.zh.about],
    en: parsed.en.length ? parsed.en : [...copy.en.about],
  };
}

const profileAbout = parseProfileAbout(profileText);

function filenameFromUrl(value: string) {
  const clean = value.split(/[?#]/)[0];
  return decodeURIComponent(clean.split("/").pop() || "");
}

function normalizeStem(value: string) {
  return filenameFromUrl(value).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function getImageType(value: string): ImageType {
  const name = filenameFromUrl(value).toLowerCase();
  if (name.includes("_cover") || name.includes("_main") || name.includes("主图")) return "main";
  if (name.includes("render")) return "render";
  if (name.includes("document")) return "document";
  if (name.includes("plan")) return "plan";
  if (name.includes("section")) return "section";
  if (name.includes("site")) return "site";
  if (name.includes("axon")) return "axon";
  if (name.includes("diagram")) return "diagram";
  if (name.includes("process") || name.includes("过程")) return "process";
  if (name.includes("model")) return "model";
  return "unknown";
}

function getDisplaySize(value: string): DisplaySize {
  const parts = filenameFromUrl(value).replace(/\.[^.]+$/, "").toLowerCase().split("_");
  if (parts.includes("xs")) return "xs";
  if (parts.includes("s")) return "s";
  if (parts.includes("m")) return "m";
  if (parts.includes("l")) return "l";
  const type = getImageType(value);
  if (["render", "document", "model"].includes(type)) return "l";
  if (["site", "axon", "plan", "section", "diagram"].includes(type)) return "m";
  return "s";
}

function getSequence(value: string) {
  const stem = filenameFromUrl(value).replace(/\.[^.]+$/, "");
  const match = stem.match(/_(\d+)$/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function compareImages(a: string, b: string) {
  const typeDiff = typeOrder[getImageType(a)] - typeOrder[getImageType(b)];
  if (typeDiff) return typeDiff;
  const sequenceDiff = getSequence(a) - getSequence(b);
  return sequenceDiff || naturalSort(a, b);
}

function cleanTitle(value: string) {
  return value.replace(/^\s*\d+\s*[-_. ]*\s*/, "").trim();
}

function folderTitle(folder: string, prefixes: string[]) {
  const prefix = prefixes.find((item) => folder.startsWith(item)) ?? "";
  return cleanTitle(folder.slice(prefix.length).replace(/_/g, " "));
}

function stableId(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (slug) return slug;
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `project-${hash.toString(36)}`;
}

function projectYear(title: string) {
  return /shell[\s-]*ter/i.test(title) ? "2025" : "2024";
}

function toAssetUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : assetUrl(value);
}

function normalizeProject(project: PortfolioProject): PortfolioProject {
  const cover = toAssetUrl(project.cover);
  const body = [...new Set((project.images || []).map(toAssetUrl).filter((image) => image !== cover))].sort(compareImages);
  return {
    ...project,
    cover,
    images: [cover, ...body],
    infoPath: project.infoPath ? toAssetUrl(project.infoPath) : undefined,
    kind: project.categoryKey === "illustration" || project.categoryKey === "goods" ? "illustration" : project.kind ?? "project",
  };
}

function materializeManifest(manifest: PortfolioManifest): PortfolioData {
  const categories = baseCategories.map((fallback) => {
    const source = manifest.categories?.find((item) => item.key === fallback.key);
    return source ? { ...fallback, ...source, image: toAssetUrl(source.image) } : fallback;
  });
  const projectsByCategory = Object.fromEntries(
    categoryKeys.map((key) => [key, (manifest.projectsByCategory?.[key] ?? []).map(normalizeProject)]),
  ) as Record<CategoryKey, PortfolioProject[]>;
  return { categories, projectsByCategory };
}

function groupedProjects(paths: string[], key: "illustration" | "goods"): PortfolioProject[] {
  const groups = new Map<string, Array<{ index: number; path: string }>>();
  for (const path of paths) {
    const stem = filenameFromUrl(path).replace(/\.[^.]+$/, "");
    const match = stem.match(/^(.*)_(\d+)$/);
    const groupName = match ? match[1] : stem;
    const index = match ? Number(match[2]) : 1;
    const items = groups.get(groupName) ?? [];
    items.push({ index, path });
    groups.set(groupName, items);
  }
  return [...groups.entries()]
    .map(([name, items]) => {
      items.sort((a, b) => a.index - b.index || naturalSort(a.path, b.path));
      const images = items.map((item) => assetUrl(item.path));
      const title = cleanTitle(name.replace(/_/g, " "));
      return {
        id: `${key}-${stableId(name)}`,
        title,
        category: key === "goods" ? "Goods" : "Illustration",
        categoryKey: key,
        year: "",
        cover: images[0],
        description: "",
        images,
        kind: "illustration" as const,
      };
    })
    .sort((a, b) => naturalSort(a.title, b.title));
}

function folderSequence(name: string) {
  const match = name.match(/_(\d+)_/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function buildPortfolio(tree: GithubTreeEntry[]): PortfolioData {
  const categories = baseCategories.map((category) => {
    const rootCover = tree.find((entry) => entry.type === "blob" && !entry.path.includes("/") && normalizeStem(entry.path) === normalizeStem(category.coverStem));
    return rootCover ? { ...category, image: assetUrl(rootCover.path) } : category;
  });
  const projectsByCategory: Record<CategoryKey, PortfolioProject[]> = {
    architecture: [],
    robotic: [],
    model: [],
    illustration: [],
    goods: [],
  };

  for (const [key, prefixes] of Object.entries(categoryFolders) as Array<[Exclude<CategoryKey, "illustration" | "goods">, string[]]>) {
    const folders = new Map<string, { images: string[]; infoPath?: string }>();
    for (const entry of tree) {
      if (entry.type !== "blob" || !entry.path.includes("/")) continue;
      const folder = entry.path.split("/")[0];
      if (!prefixes.some((prefix) => folder.startsWith(prefix))) continue;
      const item = folders.get(folder) ?? { images: [] };
      if (isImageFile(entry.path)) item.images.push(entry.path);
      else if (isProjectInfoFile(entry.path)) item.infoPath = entry.path;
      folders.set(folder, item);
    }
    projectsByCategory[key] = [...folders.entries()]
      .filter(([, item]) => item.images.length > 0)
      .sort(([a], [b]) => folderSequence(a) - folderSequence(b) || naturalSort(a, b))
      .map(([folder, item]) => {
        const sorted = [...item.images].sort(compareImages);
        const coverPath = sorted.find((path) => getImageType(path) === "main") ?? sorted[0];
        const title = folderTitle(folder, prefixes);
        return {
          id: stableId(folder),
          title,
          category: categoryNames[key],
          categoryKey: key,
          year: projectYear(title),
          cover: assetUrl(coverPath),
          description: "",
          images: [coverPath, ...sorted.filter((path) => path !== coverPath)].map(assetUrl),
          infoPath: item.infoPath ? assetUrl(item.infoPath) : undefined,
          kind: "project" as const,
        };
      });
  }

  const filesIn = (folder: string) =>
    tree
      .filter((entry) => entry.type === "blob" && isImageFile(entry.path) && entry.path.split("/")[0].toLowerCase() === folder)
      .map((entry) => entry.path);
  projectsByCategory.illustration = groupedProjects(filesIn("illustration"), "illustration");
  projectsByCategory.goods = groupedProjects(filesIn("goods"), "goods");
  return { categories, projectsByCategory };
}

function buildRows(images: string[]) {
  const rows: DisplayRow[] = [];
  for (const image of images) {
    const size = getDisplaySize(image);
    const last = rows[rows.length - 1];
    if (last && last.size === size && last.images.length < rowCapacity[size]) last.images.push(image);
    else rows.push({ size, images: [image] });
  }
  return rows;
}

function calculateRow(containerWidth: number, ratios: number[], gap: number) {
  const safe = ratios.map((ratio) => (ratio > 0 ? ratio : 1));
  const usable = Math.max(containerWidth - gap * Math.max(safe.length - 1, 0), 0);
  const height = usable / (safe.reduce((sum, ratio) => sum + ratio, 0) || 1);
  return { height, widths: safe.map((ratio) => ratio * height) };
}

function useViewportSize() {
  const [size, setSize] = useState({ width: 1440, height: 900 });
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

function stripWrappedQuotes(value: string) {
  return value.trim().replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim();
}

function prefixedInfoValue(line: string, key: string) {
  const prefix = `${key}:`;
  if (!line.trim().toLowerCase().startsWith(prefix.toLowerCase())) return "";
  return stripWrappedQuotes(line.slice(line.indexOf(":") + 1));
}

function parseProjectInfo(text: string, categoryKey: CategoryKey) {
  const normalized = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (categoryKey === "architecture") {
    const year = prefixedInfoValue(lines[0] ?? "", "1_year");
    const professor = prefixedInfoValue(lines[1] ?? "", "2_professer");
    const teamMember = prefixedInfoValue(lines[2] ?? "", "3_team member");
    const description = lines.slice(3).join("\n").trim();
    if (year || professor || teamMember || description) return { year, professor, teamMember, description };
  }
  const year = stripWrappedQuotes((lines.shift() ?? "").trim());
  return { year, professor: "", teamMember: "", description: lines.join("\n").trim() };
}

function projectInfoCandidates(project: PortfolioProject) {
  if (project.infoPath) return [project.infoPath];
  const cover = project.cover.split(/[?#]/)[0];
  const slash = cover.lastIndexOf("/");
  if (slash < 0) return [];
  const folder = cover.slice(0, slash);
  return [`${folder}/${encodeURIComponent(`${project.title}_info .txt`)}`, `${folder}/${encodeURIComponent(`${project.title}_info.txt`)}`];
}

async function hydratePortfolioInfo(data: PortfolioData) {
  const loadInfo = async (project: PortfolioProject) => {
    if (project.kind === "illustration") return project;
    for (const url of projectInfoCandidates(project)) {
      try {
        const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) continue;
        const info = parseProjectInfo(await response.text(), project.categoryKey);
        return {
          ...project,
          year: info.year || project.year,
          professor: info.professor || project.professor,
          teamMember: info.teamMember || project.teamMember,
          description: info.description,
        };
      } catch {
        // Try the next supported filename.
      }
    }
    return project;
  };
  const projectsByCategory = Object.fromEntries(
    await Promise.all(categoryKeys.map(async (key) => [key, await Promise.all(data.projectsByCategory[key].map(loadInfo))])),
  ) as Record<CategoryKey, PortfolioProject[]>;
  return { ...data, projectsByCategory };
}

function usePortfolioData() {
  const [state, setState] = useState<PortfolioData>({
    categories: baseCategories,
    projectsByCategory: { architecture: [], robotic: [], model: [], illustration: [], goods: [] },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchJson = async <T,>(url: string, headers?: HeadersInit) => {
      const response = await fetch(`${url}&t=${Date.now()}`, { cache: "no-store", headers });
      if (!response.ok) throw new Error(`${response.status}`);
      return (await response.json()) as T;
    };

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        let data: PortfolioData | null = null;
        let firstError = "";
        try {
          data = materializeManifest(await fetchJson<PortfolioManifest>(manifestUrl, { Accept: "application/json" }));
        } catch (reason) {
          firstError = reason instanceof Error ? `Manifest request failed: ${reason.message}` : "Manifest request failed";
        }
        if (!data) {
          try {
            const flat = await fetchJson<JsDelivrFlatResponse>(jsdelivrUrl, { Accept: "application/json" });
            data = buildPortfolio(flat.files.map((file) => ({ path: file.name.replace(/^\//, ""), type: "blob" })));
          } catch (reason) {
            if (!firstError) firstError = reason instanceof Error ? `jsDelivr request failed: ${reason.message}` : "jsDelivr request failed";
          }
        }
        if (!data) {
          const tree = await fetchJson<{ tree?: GithubTreeEntry[] }>(githubTreeUrl, { Accept: "application/vnd.github+json" });
          if (!Array.isArray(tree.tree)) throw new Error("GitHub returned an invalid repository tree");
          data = buildPortfolio(tree.tree);
        }
        data = await hydratePortfolioInfo(data);
        if (!cancelled) {
          setState(data);
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (reason) {
        const cached = localStorage.getItem(cacheKey);
        if (!cancelled && cached) {
          try {
            setState(JSON.parse(cached) as PortfolioData);
          } catch {
            setError(reason instanceof Error ? reason.message : "Unable to load portfolio assets");
          }
        } else if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Unable to load portfolio assets");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, loading, error };
}

function SelfTests() {
  useEffect(() => {
    const expect = (value: unknown, message: string) => {
      if (!value) throw new Error(message);
    };
    expect(getImageType("Closing Tents_model_plan_l_1.png") === "plan", "Plan should take precedence over model");
    expect(getDisplaySize("SHELL-TER_diagram_xs_5.jpg") === "xs", "XS token should be detected");
    expect(compareImages("a_document_m_1.png", "a_document_l_3.png") < 0, "Sequence should take precedence over size token");
    const row = calculateRow(1000, [2, 1], 20);
    expect(Math.abs(row.widths[0] + row.widths[1] + 20 - 1000) < 0.001, "Row should exactly fill its container");
    const displayRows = buildRows(["a_document_m_1.png", "a_document_m_2.png", "a_document_l_3.png"]);
    expect(displayRows.length === 2 && displayRows[0].images.length === 2, "Rows should preserve image order while grouping by size");
    const normalized = normalizeProject({
      id: "x",
      title: "X",
      category: "Scale Model",
      categoryKey: "model",
      year: "",
      cover: "x_cover.jpg",
      description: "",
      images: ["x_cover.jpg", "x_document_l_3.jpg", "x_document_m_1.jpg"],
    });
    expect(getSequence(normalized.images[1]) === 1, "Manifest images should be normalized by sequence");
    const architectureInfo = parseProjectInfo('1_year: "2025"\n2_professer: "Dr A"\n3_team member: "B, C"\nParagraph 1\n\nParagraph 2', "architecture");
    expect(architectureInfo.year === "2025", "Architecture year should parse");
    expect(architectureInfo.professor === "Dr A", "Architecture professor should parse");
    expect(architectureInfo.teamMember === "B, C", "Architecture team member should parse");
    expect(architectureInfo.description === "Paragraph 1\n\nParagraph 2", "Architecture paragraphs should retain blank lines");
    const architectureEmpty = parseProjectInfo('1_year: "2026"\n2_professer: ""\n3_team member: ""\nDescription', "architecture");
    expect(!architectureEmpty.professor && !architectureEmpty.teamMember, "Empty architecture fields should stay hidden");
  }, []);
  return null;
}

function Icon({ type, className = "h-6 w-6" }: { type: "linkedin" | "mail" | "bilibili" | "maker"; className?: string }) {
  if (type === "maker") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2.3 11h2.1v-5.5l2.4 3.1h.3l2.5-3.1V16h2.1V8h-1.9l-2.8 3.5L8.2 8H6.3v8Z" />
      </svg>
    );
  }
  const paths = {
    linkedin: <><path d="M8 11v8" /><path d="M8 8v.01" /><path d="M12 19v-5a3 3 0 0 1 6 0v5" /><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    bilibili: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="m9 3-2 3" /><path d="m15 3 2 3" /><path d="M10 11v4" /><path d="M14 11v4" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[type]}</svg>;
}

function Header({ showBack, onBack, lang, onLanguage }: { showBack: boolean; onBack: () => void; lang: "zh" | "en"; onLanguage: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#ff0033] text-white">
      <div className="flex h-16 items-center">
        <motion.div className="relative h-full overflow-hidden border-r border-white/90" animate={{ width: showBack ? 64 : 200 }}>
          <AnimatePresence mode="wait" initial={false}>
            {showBack ? (
              <motion.button key="back" type="button" onClick={onBack} className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <img src={ui.back} alt="Back" className="h-11 rotate-180" />
              </motion.button>
            ) : (
              <motion.a key="logo" href="/shop" className="absolute inset-0 flex items-center justify-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <img src={ui.logo} alt="Pre+Established Harmony" className="h-[26px] brightness-0 invert" />
              </motion.a>
            )}
          </AnimatePresence>
        </motion.div>
        <button
          type="button"
          onClick={onLanguage}
          aria-label={lang === "zh" ? "Switch to English" : "切换为中文"}
          className="h-full px-6 text-[15px] font-medium"
        >
          中 / EN
        </button>
        <div className="flex h-full items-center gap-6 border-x border-white/90 px-6">
          <a href={ui.bilibili} target="_blank" rel="noreferrer" title="Bilibili"><Icon type="bilibili" /></a>
          <a href={ui.makerworld} target="_blank" rel="noreferrer" title="MakerWorld"><Icon type="maker" /></a>
          <a href={ui.linkedin} target="_blank" rel="noreferrer" title="LinkedIn"><Icon type="linkedin" /></a>
        </div>
      </div>
    </header>
  );
}

function Lightbox({ images, index, onIndex, onClose }: { images: string[]; index: number | null; onIndex: (index: number) => void; onClose: () => void }) {
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") onIndex((index + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, index, onClose, onIndex]);

  if (index === null || !images[index]) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-6 top-6 z-20 text-3xl text-white/80">×</button>
        {images.length > 1 && <>
          <button type="button" onClick={() => onIndex((index - 1 + images.length) % images.length)} aria-label="Previous" className="absolute left-4 top-1/2 z-20 -translate-y-1/2 px-5 py-8 text-6xl text-white/70">‹</button>
          <button type="button" onClick={() => onIndex((index + 1) % images.length)} aria-label="Next" className="absolute right-4 top-1/2 z-20 -translate-y-1/2 px-5 py-8 text-6xl text-white/70">›</button>
        </>}
        <motion.img key={images[index]} src={images[index]} alt="" className="max-h-[74vh] max-w-[86vw] object-contain" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} />
        <div className="absolute bottom-20 left-1/2 flex w-[min(92vw,1200px)] -translate-x-1/2 gap-3 overflow-x-auto p-2">
          {images.map((image, itemIndex) => (
            <button key={image} type="button" onClick={() => onIndex(itemIndex)} className={`h-16 w-24 shrink-0 overflow-hidden border ${itemIndex === index ? "border-white opacity-100" : "border-white/25 opacity-60"}`}>
              <img src={image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs tracking-[0.18em] text-white/55">{index + 1} / {images.length}</div>
      </motion.div>
    </AnimatePresence>
  );
}

function JustifiedRow({ row, title, onOpen }: { row: DisplayRow; title: string; onOpen: (image: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setContainerWidth(element.clientWidth);
    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let active = true;
    row.images.forEach((image) => {
      const probe = new Image();
      probe.onload = () => {
        if (!active) return;
        setRatios((current) => ({ ...current, [image]: probe.naturalWidth / probe.naturalHeight || 1 }));
      };
      probe.src = image;
    });
    return () => {
      active = false;
    };
  }, [row.images]);

  const geometry = calculateRow(containerWidth || 1, row.images.map((image) => ratios[image] ?? 1), rowGap[row.size]);
  return (
    <div ref={ref} className="flex w-full items-start" style={{ gap: rowGap[row.size] }}>
      {row.images.map((image, index) => (
        <button key={image} type="button" onClick={() => onOpen(image)} className="shrink-0 overflow-hidden border-0 bg-transparent p-0" style={{ width: geometry.widths[index], height: geometry.height }}>
          <img src={image} alt={title} className="block h-full w-full object-contain transition duration-300 hover:scale-[1.02]" />
        </button>
      ))}
    </div>
  );
}

function GalleryCover({ project }: { project: PortfolioProject }) {
  const [aspect, setAspect] = useState("aspect-[4/3]");
  return (
    <div className={`overflow-hidden ${aspect}`}>
      <motion.img
        src={project.cover}
        alt={project.title}
        onLoad={(event) => {
          const ratio = event.currentTarget.naturalWidth / event.currentTarget.naturalHeight;
          setAspect(ratio > 1.55 ? "aspect-[16/10]" : ratio > 1.15 ? "aspect-[4/3]" : ratio > 0.9 ? "aspect-square" : ratio > 0.72 ? "aspect-[4/5]" : "aspect-[3/4]");
        }}
        className="h-full w-full object-cover"
        whileHover={{ scale: 1.08 }}
      />
    </div>
  );
}

function GalleryPage({ category, projects, loading, error, onProject }: { category: Category; projects: PortfolioProject[]; loading: boolean; error: string; onProject: (project: PortfolioProject) => void }) {
  const [viewer, setViewer] = useState<PortfolioProject | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  return (
    <main className="relative min-h-screen pt-16">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center text-center text-[7.5vw] font-semibold uppercase tracking-[0.07em]">{category.title.en}</div>
      <section className="relative mx-auto min-h-screen max-w-[1800px] px-2 pb-32 pt-24 md:px-14">
        {loading && !projects.length ? <div className="flex min-h-[60vh] items-center justify-center text-xs uppercase tracking-[0.2em]">Loading projects</div> : !projects.length ? <div className="flex min-h-[60vh] items-center justify-center text-center text-xs uppercase tracking-[0.2em]">No projects found{error && <span className="ml-3 text-black/40">{error}</span>}</div> : (
          <div className="flex flex-col">
            {projects.map((project, itemIndex) => {
              const layout = galleryLayout[itemIndex % galleryLayout.length];
              const right = layout.side === "right";
              return (
                <motion.button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    if (project.kind === "illustration") {
                      setViewer(project);
                      setIndex(0);
                    } else onProject(project);
                  }}
                  className={`block bg-transparent p-0 text-left ${right ? "self-end" : "self-start"}`}
                  style={{ width: layout.width, marginTop: itemIndex ? layout.offset : 0, marginLeft: right ? 0 : "2vw", marginRight: right ? "2vw" : 0 }}
                  initial={{ opacity: 0, y: 34 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: itemIndex * 0.06 }}
                >
                  <GalleryCover project={project} />
                  <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.16em] text-black/50"><span>{project.title}</span><span>{category.title.en}</span></div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>
      <Lightbox images={viewer?.images ?? []} index={index} onIndex={setIndex} onClose={() => { setIndex(null); setViewer(null); }} />
    </main>
  );
}

function ProjectPage({ project }: { project: PortfolioProject }) {
  const { width: viewport, height: viewportHeight } = useViewportSize();
  const [coverRatio, setCoverRatio] = useState(1.4);
  const [index, setIndex] = useState<number | null>(null);
  const cover = project.cover || project.images[0];
  const body = useMemo(() => project.images.filter((image) => image !== cover), [project.images, cover]);
  const rows = useMemo(() => buildRows(body), [body]);
  const paragraphs = useMemo(() => project.description.split(/\n+/).map((text) => text.trim()).filter(Boolean), [project.description]);
  const desktop = viewport >= 768;
  const coverIsVerticalOrSquare = coverRatio <= 1;
  const coverWidth = desktop ? (coverIsVerticalOrSquare ? viewportHeight * 0.8 * coverRatio : viewport * 0.6) : undefined;
  const coverHeight = desktop ? (coverIsVerticalOrSquare ? viewportHeight * 0.8 : (viewport * 0.6) / Math.max(coverRatio, 0.1)) : undefined;
  const open = (image: string) => setIndex(project.images.indexOf(image));

  return (
    <main className="min-h-screen bg-white pt-16">
      <section className="pl-0 pr-6 pb-0 pt-0 md:pr-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-0">
          <button type="button" onClick={() => open(cover)} className="block shrink-0 bg-transparent p-0">
            <img
              src={cover}
              alt={project.title}
              onLoad={(event) => setCoverRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight || 1)}
              className="block max-w-full object-contain"
              style={desktop ? { width: coverWidth, height: coverHeight } : { width: "100%", height: "auto", maxHeight: "72vh" }}
            />
          </button>
          <div className="flex min-w-0 flex-1 flex-col self-stretch pt-6 md:min-h-0 md:pt-8" style={{ paddingLeft: desktop ? 48 : 0 }}>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">{project.category}</div>
            <h1 className="mb-8 text-[clamp(48px,5vw,88px)] font-light uppercase leading-[0.92] tracking-[-0.06em]">{project.title}</h1>
            <div className="space-y-2 text-[13px] leading-5 text-black/60">
              {project.year && <div>Year: {project.year}</div>}
              {project.professor && <div>Professor: {project.professor}</div>}
              {project.teamMember && <div>Team Member: {project.teamMember}</div>}
            </div>
            <div className="mt-8 min-h-[160px] w-full max-w-[520px] self-start text-left text-[13px] leading-6 text-black/60">
              <div className="space-y-6">
                {paragraphs.map((paragraph, paragraphIndex) => <p key={`${paragraphIndex}-${paragraph.slice(0, 24)}`} className="whitespace-normal break-words">{paragraph}</p>)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-8 px-24 pb-20 pt-8 md:px-56">
        {rows.map((row, rowIndex) => <JustifiedRow key={`${row.images[0]}-${rowIndex}`} row={row} title={project.title} onOpen={open} />)}
      </section>
      <Lightbox images={project.images} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </main>
  );
}

function HomePage({ categories, activeIndex, setHovered, onCategory, lang }: { categories: Category[]; activeIndex: number; setHovered: (index: number | null) => void; onCategory: (key: CategoryKey) => void; lang: "zh" | "en" }) {
  const text = { ...copy[lang], about: profileAbout[lang] };
  return (
    <main className="pt-16">
      <section className="flex h-[calc(90vh-64px)] items-center overflow-visible">
        {categories.map((item, index) => {
          const active = index === activeIndex;
          return (
            <motion.button
              key={item.key}
              type="button"
              onClick={() => onCategory(item.key)}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className="relative min-w-0 overflow-hidden text-left"
              animate={{ flex: active ? 4 : 1, height: active ? "100%" : "80%" }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${item.image})`,
                  backgroundPosition: item.key === "robotic" ? "left center" : "center",
                  backgroundSize: item.key === "goods" ? "cover" : "auto 100%",
                  backgroundRepeat: "no-repeat",
                  filter: active ? "grayscale(0%)" : "grayscale(100%)",
                }}
                animate={{ scale: active && item.key !== "illustration" ? 1.15 : 1 }}
              />
              <motion.h2 className="absolute right-[10px] top-6 z-20 whitespace-nowrap text-[clamp(42px,5.2vw,86px)] font-semibold uppercase leading-none tracking-[0.03em] text-white" style={{ writingMode: "vertical-rl" }} animate={{ opacity: active ? 0 : 1 }}>
                {item.title.en}
              </motion.h2>
            </motion.button>
          );
        })}
      </section>
      <section className="flex min-h-32 flex-wrap items-end justify-between gap-x-8 gap-y-3 px-6 py-4 md:px-14">
        <h1 className="-ml-[30px] min-w-0 max-w-full flex-1 basis-[520px] whitespace-normal break-words text-[72px] font-medium leading-[0.95] tracking-[0.08em]" style={{ fontFamily: "SofiaPro" }}>{text.name}</h1>
        <span className="shrink-0 text-[24px] leading-none text-black/70" style={{ fontFamily: "SofiaPro" }}>{text.subname}</span>
      </section>
      <section className="grid gap-12 px-14 py-24 lg:grid-cols-2">
        <div>{text.about.map((paragraph) => <p key={paragraph} className="mb-6 leading-relaxed text-black/70">{paragraph}</p>)}</div>
        <div className="flex items-start justify-center lg:justify-end lg:pr-[10%]">
          <img
            src={ui.portrait}
            alt="Zekai Lin portrait"
            className="block h-auto w-[320px] max-w-full shrink-0 object-contain grayscale"
          />
        </div>
      </section>
      <section className="flex justify-center py-6"><a href={`mailto:${ui.email}`} className="inline-flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#ff0033] text-white"><Icon type="mail" className="h-8 w-8" /></a></section>
    </main>
  );
}

export default function PortfolioWebsitePrototype() {
  const { categories, projectsByCategory, loading, error } = usePortfolioData();
  const [hovered, setHovered] = useState<number | null>(null);
  const [autoIndex, setAutoIndex] = useState(0);
  const [lang, setLang] = useState<"zh" | "en">(() =>
    /^\/en(?:\/|$)/i.test(window.location.pathname) ? "en" : "zh",
  );
  const [categoryKey, setCategoryKey] = useState<CategoryKey | null>(null);
  const [project, setProject] = useState<PortfolioProject | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const selectedCategory = categories.find((category) => category.key === categoryKey) ?? null;

  useEffect(() => {
    const syncLanguageFromUrl = () => {
      const pathname = window.location.pathname;
      const nextLanguage = /^\/en(?:\/|$)/i.test(pathname) ? "en" : "zh";
      setLang(nextLanguage);
      document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
      if (!/^\/(?:cn|en)\/?$/i.test(pathname)) {
        window.history.replaceState(null, "", `/${nextLanguage === "zh" ? "cn" : "en"}${window.location.search}${window.location.hash}`);
      }
    };
    syncLanguageFromUrl();
    window.addEventListener("popstate", syncLanguageFromUrl);
    return () => window.removeEventListener("popstate", syncLanguageFromUrl);
  }, []);

  const changeLanguage = () => {
    setLang((current) => {
      const nextLanguage = current === "zh" ? "en" : "zh";
      window.history.pushState(null, "", `/${nextLanguage === "zh" ? "cn" : "en"}`);
      document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
      return nextLanguage;
    });
  };

  useEffect(() => {
    if (hovered !== null || categoryKey !== null || categories.length === 0) return;
    const timer = window.setInterval(() => setAutoIndex((index) => (index + 1) % categories.length), 4800);
    return () => window.clearInterval(timer);
  }, [hovered, categoryKey, categories.length]);

  const transition = (action: () => void) => {
    setTransitioning(true);
    window.setTimeout(() => {
      action();
      window.scrollTo({ top: 0 });
    }, 160);
    window.setTimeout(() => setTransitioning(false), 310);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <style>{`@font-face{font-family:SofiaPro;src:url('${ui.font}') format('truetype');font-display:swap}`}</style>
      <SelfTests />
      <Header
        showBack={Boolean(categoryKey)}
        onBack={() => transition(() => project ? setProject(null) : setCategoryKey(null))}
        lang={lang}
        onLanguage={changeLanguage}
      />
      {project ? (
        <ProjectPage key={project.id} project={project} />
      ) : selectedCategory ? (
        <GalleryPage
          key={selectedCategory.key}
          category={selectedCategory}
          projects={projectsByCategory[selectedCategory.key]}
          loading={loading}
          error={error}
          onProject={(item) => transition(() => setProject(item))}
        />
      ) : (
        <HomePage
          categories={categories}
          activeIndex={hovered ?? autoIndex}
          setHovered={setHovered}
          onCategory={(key) => transition(() => setCategoryKey(key))}
          lang={lang}
        />
      )}
      <motion.div className="pointer-events-none fixed inset-0 z-40 bg-white" animate={{ opacity: transitioning ? 1 : 0 }} transition={{ duration: 0.21 }} />
    </div>
  );
}

