export interface ResearchDomain {
  domain: string;
  subfields: string[];
}

export const RESEARCH_INTERESTS: ResearchDomain[] = [
  {
    domain: 'Computer Science & Technology',
    subfields: [
      'Artificial Intelligence', 'Machine Learning',
      'Data Science', 'Cybersecurity',
      'Software Engineering', 'Computer Engineering',
      'Human-Computer Interaction', 'Game Development',
      'Game Design', 'UX Design', 'Cloud Computing',
      'Internet of Things', 'Blockchain',
      'Computational Linguistics', 'Data Engineering',
      'Information Systems', 'Information Technology',
    ],
  },
  {
    domain: 'Mathematics & Statistics',
    subfields: [
      'Pure Mathematics', 'Applied Mathematics',
      'Statistics', 'Biostatistics',
      'Operations Research', 'Actuarial Science',
      'Quantitative Finance',
    ],
  },
  {
    domain: 'Engineering',
    subfields: [
      'Electrical Engineering', 'Mechanical Engineering',
      'Civil Engineering', 'Chemical Engineering',
      'Industrial Engineering', 'Aerospace Engineering',
      'Biomedical Engineering', 'Materials Science',
      'Nanotechnology', 'Renewable Energy',
      'Energy Systems', 'Robotics',
      'Systems Engineering',
    ],
  },
  {
    domain: 'Life Sciences & Medicine',
    subfields: [
      'Medicine', 'Nursing', 'Pharmacy', 'Dentistry',
      'Veterinary Science', 'Neuroscience',
      'Bioinformatics', 'Computational Biology',
      'Health Informatics', 'Epidemiology',
      'Global Health', 'Public Health', 'Health Policy',
      'Nutrition Science',
    ],
  },
  {
    domain: 'Natural Sciences',
    subfields: [
      'Physics', 'Chemistry', 'Biology',
      'Earth Science', 'Geology', 'Geography',
      'Climate Science', 'Environmental Science',
      'Marine Science', 'Forestry', 'Agriculture',
      'Agricultural Economics', 'Food Science',
    ],
  },
  {
    domain: 'Social Sciences',
    subfields: [
      'Psychology', 'Sociology', 'Anthropology',
      'Cognitive Science', 'Linguistics',
      'Criminology', 'Social Work',
      'Development Studies', 'Gender Studies',
      'Peace and Conflict Studies',
    ],
  },
  {
    domain: 'Politics, Policy & Law',
    subfields: [
      'Political Science', 'International Relations',
      'Public Policy', 'Public Administration',
      'Public Health Policy', 'Law',
      'Human Rights', 'Diplomacy',
    ],
  },
  {
    domain: 'Business & Management',
    subfields: [
      'Business Administration', 'Management',
      'Finance', 'Accounting', 'Economics',
      'Marketing', 'Entrepreneurship',
      'Supply Chain Management',
      'Operations Management',
      'Human Resource Management',
      'Project Management',
      'Hospitality Management',
      'Tourism Management',
    ],
  },
  {
    domain: 'Arts, Humanities & Media',
    subfields: [
      'History', 'Philosophy', 'English Literature',
      'Creative Writing', 'Linguistics',
      'Religious Studies', 'Art History',
      'Fine Arts', 'Music', 'Theatre Arts',
      'Film Studies', 'Media Studies',
      'Communication Studies', 'Journalism',
      'Digital Humanities',
    ],
  },
  {
    domain: 'Education',
    subfields: [
      'Education', 'Educational Technology',
      'Curriculum Studies', 'Higher Education',
      'Special Education', 'Early Childhood Education',
    ],
  },
  {
    domain: 'Architecture & Design',
    subfields: [
      'Architecture', 'Urban Planning',
      'Landscape Architecture', 'Interior Design',
      'Design Studies', 'UX Design',
    ],
  },
  {
    domain: 'Information & Library Science',
    subfields: [
      'Library and Information Science',
      'Archival Studies', 'Knowledge Management',
    ],
  },
  {
    domain: 'Interdisciplinary',
    subfields: [
      'Ethics', 'Science and Technology Studies',
      'Environmental Studies', 'Area Studies',
      'Cultural Studies', 'Computational Social Science',
    ],
  },
];
