import { saveAs } from 'file-saver';
import type { FileUploadResult } from '../types/index.js';

/**
 * Handles file upload from user's device
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

    if (!file.name.endsWith('.json')) {
      resolve({
        success: false,
        error: 'Please select a JSON file',
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve({
        success: true,
        content,
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
 * Loads JSON from a URL
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

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load URL',
    };
  }
}

/**
 * Downloads content as a file
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
