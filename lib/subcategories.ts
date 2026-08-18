/* Sub-categories per main category. Keyed by the parent category slug.
   Used by the admin forms, professional profiles and search filters. */

export type Sub = { slug: string; name: string };

export const SUBCATEGORIES: Record<string, Sub[]> = {
  tutor: [
    { slug: "matematike", name: "Matematikë" },
    { slug: "fizike", name: "Fizikë" },
    { slug: "kimi", name: "Kimi" },
    { slug: "biologji", name: "Biologji" },
    { slug: "anglisht", name: "Anglisht" },
    { slug: "gjermanisht", name: "Gjermanisht" },
    { slug: "frengjisht", name: "Frëngjisht" },
    { slug: "italisht", name: "Italisht" },
    { slug: "turqisht", name: "Turqisht" },
    { slug: "informatike", name: "Informatikë" },
    { slug: "muzike", name: "Muzikë / Instrument" },
    { slug: "pergatitje-provimi", name: "Përgatitje për provim" },
  ],
  vallezim: [
    { slug: "balet", name: "Balet" },
    { slug: "hip-hop", name: "Hip hop" },
    { slug: "vallet-popullore", name: "Valle popullore" },
    { slug: "salsa-bachata", name: "Salsa & Bachata" },
    { slug: "moderne", name: "Vallëzim modern" },
    { slug: "zumba", name: "Zumba" },
    { slug: "vallezim-dasme", name: "Vallëzim për dasmë" },
  ],
  "kujdes-kafshe": [
    { slug: "shetitje-qeni", name: "Shëtitje qeni" },
    { slug: "kujdestari-kafshesh", name: "Kujdestari kafshësh" },
    { slug: "banjo-qethje", name: "Banjo & qethje" },
    { slug: "dresure", name: "Dresurë" },
    { slug: "transport-kafshesh", name: "Transport kafshësh" },
    { slug: "vizite-veterinare", name: "Vizitë veterinare" },
  ],
  pastrim: [
    { slug: "pastrim-shtepie", name: "Pastrim shtëpie" },
    { slug: "pastrim-zyre", name: "Pastrim zyre" },
    { slug: "pas-renovimit", name: "Pastrim pas renovimit" },
    { slug: "tapete-tapiceri", name: "Tapete & tapiceri" },
    { slug: "dritare-fasada", name: "Dritare & fasada" },
    { slug: "dezinfektim", name: "Dezinfektim" },
  ],
  ndertim: [
    { slug: "muratari", name: "Muratari" },
    { slug: "suvatim", name: "Suvatim" },
    { slug: "pllakash", name: "Vendosje pllakash" },
    { slug: "gips-karton", name: "Gips karton" },
    { slug: "izolim", name: "Izolim termik" },
    { slug: "kulm-catia", name: "Kulm & çati" },
    { slug: "renovim-komplet", name: "Renovim komplet" },
  ],
  hidraulik: [
    { slug: "rrjedhje-uji", name: "Rrjedhje uji" },
    { slug: "bojler", name: "Bojler" },
    { slug: "banjo-kuzhine", name: "Instalime banjo & kuzhinë" },
    { slug: "kanalizim", name: "Kanalizim" },
    { slug: "ngrohje-qendrore", name: "Ngrohje qendrore" },
  ],
  elektricist: [
    { slug: "instalime-elektrike", name: "Instalime elektrike" },
    { slug: "ndricim", name: "Ndriçim" },
    { slug: "prizat-cikjet", name: "Priza & çelësa" },
    { slug: "tabela-siguresash", name: "Tabelë siguresash" },
    { slug: "kamera-alarme", name: "Kamera & alarme" },
  ],
  transport: [
    { slug: "shperngulje", name: "Shpërngulje" },
    { slug: "transport-mobiljesh", name: "Transport mobiljesh" },
    { slug: "transport-material", name: "Transport materiali" },
    { slug: "bartje-mbeturinash", name: "Bartje mbeturinash" },
  ],
  fotograf: [
    { slug: "dasma", name: "Dasma" },
    { slug: "evente", name: "Evente" },
    { slug: "portret", name: "Portret" },
    { slug: "produkt", name: "Fotografi produkti" },
    { slug: "video-dron", name: "Video & dron" },
  ],
  parukeri: [
    { slug: "prerje-flokesh", name: "Prerje flokësh" },
    { slug: "ngjyrosje", name: "Ngjyrosje" },
    { slug: "koke-dasme", name: "Krehje për dasmë" },
    { slug: "berber", name: "Berber" },
    { slug: "trajtime-flokesh", name: "Trajtime flokësh" },
  ],
  makeup: [
    { slug: "makeup-dasme", name: "Makeup për dasmë" },
    { slug: "makeup-eventi", name: "Makeup për event" },
    { slug: "vetulla-qerpike", name: "Vetulla & qerpikë" },
    { slug: "kurse-makeup", name: "Kurse makeup" },
  ],
  riparime: [
    { slug: "pajisje-shtepiake", name: "Pajisje shtëpiake" },
    { slug: "mobilje-riparim", name: "Riparim mobiljesh" },
    { slug: "dyer-dritare", name: "Dyer & dritare" },
    { slug: "elektronike", name: "Elektronikë" },
  ],
  kopsht: [
    { slug: "prerje-barit", name: "Prerje bari" },
    { slug: "krasitje", name: "Krasitje pemësh" },
    { slug: "mirembajtje-kopshti", name: "Mirëmbajtje kopshti" },
    { slug: "sistem-ujitje", name: "Sistem ujitjeje" },
  ],
  nane: [
    { slug: "kujdes-ditor", name: "Kujdes ditor" },
    { slug: "kujdes-mbremjeve", name: "Kujdes në mbrëmje" },
    { slug: "kujdes-foshnjash", name: "Kujdes foshnjash" },
    { slug: "ndihme-detyrash", name: "Ndihmë me detyra" },
  ],
  "kujdes-pleq": [
    { slug: "shoqerim", name: "Shoqërim" },
    { slug: "kujdes-shtepiak", name: "Kujdes shtëpiak" },
    { slug: "ndihme-levizje", name: "Ndihmë në lëvizje" },
    { slug: "kujdes-naten", name: "Kujdes gjatë natës" },
  ],
  evente: [
    { slug: "dasma-organizim", name: "Organizim dasme" },
    { slug: "ditelindje", name: "Ditëlindje" },
    { slug: "evente-korporative", name: "Evente korporative" },
    { slug: "dekor-evente", name: "Dekor eventesh" },
    { slug: "dj-muzike", name: "DJ & muzikë" },
  ],
  "shofer-personal": [
    { slug: "shofer-privat", name: "Shofer privat" },
    { slug: "transfer-aeroport", name: "Transfer aeroporti" },
    { slug: "shofer-eventi", name: "Shofer për event" },
  ],
  mobilje: [
    { slug: "mobilje-porosi", name: "Mobilje me porosi" },
    { slug: "kuzhina", name: "Kuzhina" },
    { slug: "dollape", name: "Dollapë" },
    { slug: "montim-mobiljesh", name: "Montim mobiljesh" },
  ],
  piktor: [
    { slug: "lyerje-brendshme", name: "Lyerje e brendshme" },
    { slug: "lyerje-fasade", name: "Lyerje fasade" },
    { slug: "tapet-muri", name: "Tapet muri" },
    { slug: "dekor-muri", name: "Dekor muri" },
  ],
};

export const subsFor = (slug: string): Sub[] => SUBCATEGORIES[slug] ?? [];
export const hasSubs = (slug: string) => (SUBCATEGORIES[slug]?.length ?? 0) > 0;
