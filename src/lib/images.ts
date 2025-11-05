function slugifyCardName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function candidateImageUrls(name: string): string[] {
  const slug = slugifyCardName(name);
  const spaced = name.replace(/\s+/g, "%20");
  const underscored = name.replace(/\s+/g, "_");
  return [
    // Essais basés sur patterns plausibles
    `https://www.lolcards.fr/_next/image?url=/images/cards/${slug}.webp&w=640&q=75`,
    `https://www.lolcards.fr/images/cards/${slug}.webp`,
    `https://piltoverarchive.com/cards/${slug}.jpg`,
    `https://piltoverarchive.com/cards/${slug}.png`,
    `https://piltoverarchive.com/cards/${spaced}.jpg`,
    `https://piltoverarchive.com/cards/${spaced}.png`,
    `https://piltoverarchive.com/cards/${underscored}.jpg`,
    `https://piltoverarchive.com/cards/${underscored}.png`,
  ];
}

export function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}


