import { saveAs } from 'file-saver';
import type { FileUploadResult, ConversionFormat } from '../types/index.js';

/**
 * Detects ConversionFormat from file name extension
 */
export function detectFormatFromFilename(filename: string): ConversionFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.xml')) return 'xml';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
  if (lower.endsWith('.toml')) return 'toml';
  if (lower.endsWith('.toon')) return 'toon';
  return 'json';
}

/**
 * Handles file upload from user's device with format detection
 */
export function uploadFile(file: File): Promise<FileUploadResult> {
  return new Promise((resolve) => {
    if (!file) {
      resolve({
        success: false,
        error: 'No file selected',
      });
      return;
    }

    const format = detectFormatFromFilename(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      resolve({
        success: true,
        content,
        format,
      });
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Loads JSON/data from a URL
 */
export async function loadFromURL(url: string): Promise<FileUploadResult> {
  if (!url || url.trim() === '') {
    return {
      success: false,
      error: 'Please enter a URL',
    };
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch: ${response.statusText}`,
      };
    }

    const content = await response.text();
    const format = detectFormatFromFilename(url);

    return {
      success: true,
      content,
      format,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load URL',
    };
  }
}

/**
 * Downloads content as a file with appropriate MIME type
 */
export function downloadFile(
  content: string,
  filename: string = 'data.json',
  mimeType: string = 'application/json'
): void {
  const blob = new Blob([content], { type: mimeType });
  saveAs(blob, filename);
}

/**
 * Copies content to clipboard
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
