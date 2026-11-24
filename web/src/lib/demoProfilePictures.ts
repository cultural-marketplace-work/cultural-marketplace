import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

function profilePicturePath(customerId: number): string {
  return path.join(process.cwd(), '.data', 'customer-profile-pictures', `${customerId}.txt`);
}

export async function getDemoProfilePicture(customerId: number): Promise<string | null> {
  try {
    const profilePicture = await readFile(profilePicturePath(customerId), 'utf8');
    return profilePicture.trim() || null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveDemoProfilePicture(customerId: number, profilePicture: string): Promise<void> {
  const filePath = profilePicturePath(customerId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, profilePicture, 'utf8');
}

export async function removeDemoProfilePicture(customerId: number): Promise<void> {
  try {
    await unlink(profilePicturePath(customerId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
