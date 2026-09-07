export type Visibility = 'private' | 'unlisted' | 'public';

export type MapLine = {
  id: string;
  text: string;
  reading: string;
  startTime: number;
  endTime?: number;
};

export type TypingMap = {
  id: string;
  authorId: string;
  title: string;
  description: string;
  youtubeVideoId: string;
  tags: string[];
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  lines: MapLine[];
};
