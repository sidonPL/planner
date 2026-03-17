import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError } from "@/lib/api-error-handler";
import { parseRecipeWithGemini } from "@/lib/gemini-recipe-parser";

/**
 * POST /api/recipes/import/youtube
 *
 * Import recipe from YouTube video
 *
 * Body: { url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Get video details using YouTube Data API
    const videoData = await fetchYouTubeVideoData(videoId);

    if (!videoData) {
      return NextResponse.json(
        { error: "Could not fetch video data" },
        { status: 404 }
      );
    }

    // Combine title, description, and transcript for parsing
    const contentToParse = `
Title: ${videoData.title}

Description:
${videoData.description}

${videoData.transcript ? `\nTranscript:\n${videoData.transcript}` : ''}
    `.trim();

    // Use Gemini to parse recipe from content
    const parsedRecipe = await parseRecipeWithGemini(contentToParse, url);

    if (!parsedRecipe) {
      return NextResponse.json(
        { error: "Could not parse recipe from video" },
        { status: 422 }
      );
    }

    // Add video thumbnail as image if no image found
    if (!parsedRecipe.image && videoData.thumbnail) {
      parsedRecipe.image = videoData.thumbnail;
    }

    // Ensure recipe has source and videoUrl (extend type if needed)
    const recipeWithMetadata = {
      ...parsedRecipe,
      videoUrl: url,
      source: `YouTube: ${videoData.title}`,
    };

    return NextResponse.json({
      recipe: recipeWithMetadata,
      videoData: {
        title: videoData.title,
        channelName: videoData.channelName,
        thumbnail: videoData.thumbnail,
      }
    });
  } catch (error) {
    console.error("YouTube import error:", error);
    return handleApiError(error);
  }
}

function extractYouTubeVideoId(url: string): string | null {
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

interface YouTubeVideoData {
  title: string;
  description: string;
  channelName: string;
  thumbnail: string;
  transcript?: string;
}

async function fetchYouTubeVideoData(videoId: string): Promise<YouTubeVideoData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("YouTube API key not configured, using fallback");
    // Fallback: Try to scrape basic info (less reliable)
    return fetchYouTubeDataFallback(videoId);
  }

  try {
    // Fetch video details from YouTube Data API v3
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error("YouTube API request failed");
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const video = data.items[0];
    const snippet = video.snippet;

    return {
      title: snippet.title,
      description: snippet.description,
      channelName: snippet.channelTitle,
      thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      // Note: Transcript requires additional API or library (youtube-transcript)
      // For now, we'll rely on description
    };
  } catch (error) {
    console.error("YouTube API error:", error);
    return fetchYouTubeDataFallback(videoId);
  }
}

async function fetchYouTubeDataFallback(videoId: string): Promise<YouTubeVideoData | null> {
  try {
    // Fallback: Fetch basic info from oembed
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      title: data.title || "YouTube Recipe",
      description: "",
      channelName: data.author_name || "Unknown",
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  } catch (error) {
    console.error("YouTube fallback error:", error);
    return null;
  }
}

