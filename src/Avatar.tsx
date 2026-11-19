import { useEffect, useState } from 'react';
import type { Chat } from './types';
export function ConversationAvatar({
  chat,
  large = false,
}: {
  chat: Pick<Chat, 'name' | 'avatar'>;
  large?: boolean;
}) {
  const [image, setImage] = useState('');
  useEffect(() => {
    if (!chat.avatar) {
      setImage('');
      return;
    }
    const url = URL.createObjectURL(chat.avatar);
    setImage(url);
    return () => URL.revokeObjectURL(url);
  }, [chat.avatar]);
  const letters =
    chat.name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  return (
    <span className={`avatar ${large ? 'avatar-large' : ''}`} aria-hidden="true">
      {image ? <img src={image} alt="" onError={() => setImage('')} /> : letters}
    </span>
  );
}
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type))
    throw new Error('Choose a JPG, PNG, WebP, GIF, or AVIF image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Please choose an image smaller than 15 MB.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image could not be opened. Try a JPG or PNG.');
  }
  try {
    const size = Math.min(bitmap.width, bitmap.height),
      canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image editing is unavailable in this browser.');
    context.drawImage(
      bitmap,
      (bitmap.width - size) / 2,
      (bitmap.height - size) / 2,
      size,
      size,
      0,
      0,
      512,
      512,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare this image.'))),
        'image/webp',
        0.88,
      ),
    );
  } finally {
    bitmap.close();
  }
}
