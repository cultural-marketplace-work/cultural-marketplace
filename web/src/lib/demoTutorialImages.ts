import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

function tutorialGalleryPath(productId: number): string {
  return path.join(process.cwd(), '.data', 'product-tutorial-images', `${productId}.json`);
}

export async function getDemoTutorialGallery(productId: number): Promise<string[] | null> {
  try {
    const contents = await readFile(tutorialGalleryPath(productId), 'utf8');
    const gallery: unknown = JSON.parse(contents);
    if (!Array.isArray(gallery) || !gallery.every((url) => typeof url === 'string')) {
      throw new Error(`The saved tutorial image gallery for product ${productId} is invalid.`);
    }
    return gallery;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveDemoTutorialGallery(productId: number, gallery: string[]): Promise<void> {
  const filePath = tutorialGalleryPath(productId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(gallery), 'utf8');
}

export async function removeDemoTutorialGallery(productId: number): Promise<void> {
  try {
    await unlink(tutorialGalleryPath(productId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
