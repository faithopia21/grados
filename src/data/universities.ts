export interface University {
  name: string;
  country: string;
  web_pages?: string[];
}

const FALLBACK_UNIVERSITIES: University[] = [
  // US - Ivy & Elite
  { name: 'Harvard University', country: 'United States' },
  { name: 'Stanford University', country: 'United States' },
  { name: 'Massachusetts Institute of Technology (MIT)', country: 'United States' },
  { name: 'Yale University', country: 'United States' },
  { name: 'Princeton University', country: 'United States' },
  { name: 'Columbia University', country: 'United States' },
  { name: 'University of Pennsylvania', country: 'United States' },
  { name: 'Cornell University', country: 'United States' },
  { name: 'Brown University', country: 'United States' },
  { name: 'Dartmouth College', country: 'United States' },
  { name: 'California Institute of Technology (Caltech)', country: 'United States' },
  { name: 'University of Chicago', country: 'United States' },
  { name: 'Johns Hopkins University', country: 'United States' },
  { name: 'Northwestern University', country: 'United States' },
  { name: 'Duke University', country: 'United States' },
  // US - Top Public/CS
  { name: 'University of California, Berkeley (UCB)', country: 'United States' },
  { name: 'University of California, Los Angeles (UCLA)', country: 'United States' },
  { name: 'University of Michigan, Ann Arbor', country: 'United States' },
  { name: 'University of Washington', country: 'United States' },
  { name: 'University of Texas at Austin', country: 'United States' },
  { name: 'University of Illinois at Urbana-Champaign', country: 'United States' },
  { name: 'Georgia Institute of Technology', country: 'United States' },
  { name: 'Carnegie Mellon University', country: 'United States' },
  { name: 'University of California, San Diego (UCSD)', country: 'United States' },
  { name: 'New York University (NYU)', country: 'United States' },
  { name: 'University of Southern California (USC)', country: 'United States' },
  // UK - Russell Group & Top
  { name: 'University of Oxford', country: 'United Kingdom' },
  { name: 'University of Cambridge', country: 'United Kingdom' },
  { name: 'Imperial College London', country: 'United Kingdom' },
  { name: 'University College London (UCL)', country: 'United Kingdom' },
  { name: 'London School of Economics and Political Science (LSE)', country: 'United Kingdom' },
  { name: 'King\'s College London', country: 'United Kingdom' },
  { name: 'University of Edinburgh', country: 'United Kingdom' },
  { name: 'University of Manchester', country: 'United Kingdom' },
  { name: 'University of Warwick', country: 'United Kingdom' },
  { name: 'University of Bristol', country: 'United Kingdom' },
  { name: 'University of Glasgow', country: 'United Kingdom' },
  { name: 'University of Southampton', country: 'United Kingdom' },
  { name: 'University of Nottingham', country: 'United Kingdom' },
  // Canada
  { name: 'University of Toronto', country: 'Canada' },
  { name: 'University of British Columbia', country: 'Canada' },
  { name: 'McGill University', country: 'Canada' },
  { name: 'University of Waterloo', country: 'Canada' },
  { name: 'McMaster University', country: 'Canada' },
  { name: 'University of Montreal', country: 'Canada' },
  { name: 'University of Alberta', country: 'Canada' },
  // Europe
  { name: 'ETH Zurich', country: 'Switzerland' },
  { name: 'EPFL', country: 'Switzerland' },
  { name: 'Technical University of Munich (TUM)', country: 'Germany' },
  { name: 'LMU Munich', country: 'Germany' },
  { name: 'Heidelberg University', country: 'Germany' },
  { name: 'Delft University of Technology', country: 'Netherlands' },
  { name: 'University of Amsterdam', country: 'Netherlands' },
  { name: 'KU Leuven', country: 'Belgium' },
  { name: 'KTH Royal Institute of Technology', country: 'Sweden' },
  { name: 'Karolinska Institute', country: 'Sweden' },
  { name: 'University of Copenhagen', country: 'Denmark' },
  { name: 'Sorbonne University', country: 'France' },
  { name: 'Ecole Polytechnique', country: 'France' },
  { name: 'Politecnico di Milano', country: 'Italy' },
  // Asia
  { name: 'National University of Singapore (NUS)', country: 'Singapore' },
  { name: 'Nanyang Technological University (NTU)', country: 'Singapore' },
  { name: 'Tsinghua University', country: 'China' },
  { name: 'Peking University', country: 'China' },
  { name: 'Zhejiang University', country: 'China' },
  { name: 'Fudan University', country: 'China' },
  { name: 'Shanghai Jiao Tong University', country: 'China' },
  { name: 'University of Tokyo', country: 'Japan' },
  { name: 'Kyoto University', country: 'Japan' },
  { name: 'Tokyo Institute of Technology', country: 'Japan' },
  { name: 'Seoul National University', country: 'South Korea' },
  { name: 'KAIST', country: 'South Korea' },
  { name: 'Pohang University of Science and Technology (POSTECH)', country: 'South Korea' },
  { name: 'University of Hong Kong (HKU)', country: 'Hong Kong' },
  { name: 'Hong Kong University of Science and Technology (HKUST)', country: 'Hong Kong' },
  // Australia
  { name: 'University of Melbourne', country: 'Australia' },
  { name: 'University of Sydney', country: 'Australia' },
  { name: 'University of New South Wales (UNSW)', country: 'Australia' },
  { name: 'Australian National University (ANU)', country: 'Australia' },
  { name: 'University of Queensland', country: 'Australia' },
  { name: 'Monash University', country: 'Australia' }
];

export async function searchUniversities(
  query: string
): Promise<University[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length < 2) return [];

  let results: University[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(
      `https://universities.hipolabs.com/search?name=${encodeURIComponent(normalizedQuery)}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      results = data;
    }
  } catch {
    // API failed or timed out, will use fallback
    console.warn('University API failed, using fallback list');
  }

  // If API returned nothing or failed, use fallback
  if (results.length === 0) {
    results = FALLBACK_UNIVERSITIES.filter(u => 
      u.name.toLowerCase().includes(normalizedQuery)
    );
  }

  // Deduplicate and return top 8
  const uniqueNames = new Set<string>();
  const filtered: University[] = [];

  for (const uni of results) {
    if (!uniqueNames.has(uni.name)) {
      uniqueNames.add(uni.name);
      filtered.push(uni);
    }
    if (filtered.length >= 8) break;
  }

  return filtered;
}
