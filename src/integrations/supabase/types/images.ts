export interface Image {
  id: string;
  url: string;
  file_path: string;
  created_at: string;
  source_url: string | null;
  is_selected: boolean | null;
}

export interface ScrapedImage {
  id: string;
  url: string;
  source_url: string;
  created_at: string;
}