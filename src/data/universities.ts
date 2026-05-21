export interface University {
  name: string;
  country: string;
  web_pages: string[];
}

export async function searchUniversities(
  query: string
): Promise<University[]> {
  if (query.length < 2) return [];
  try {
    const response = await fetch(
      `https://universities.hipolabs.com/search?name=${encodeURIComponent(query)}`
    );
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data
      .slice(0, 8)
      .sort((a: University, b: University) =>
        a.name.localeCompare(b.name)
      );
  } catch {
    throw new Error('Search unavailable');
  }
}
