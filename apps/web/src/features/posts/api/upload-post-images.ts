import { POST_MAX_IMAGES } from '@logpose/contracts/common/post.schemas';
import * as z from 'zod/v4';

// La subida es REST (multipart), fuera del contrato oRPC: la respuesta se valida aquí.
const uploadPostImagesResponseSchema = z.object({
  imageUrls: z.array(z.url()),
});

export async function uploadPostImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const response = await fetch('/api/upload/post-media', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const message =
      response.status === 503
        ? 'Cloudinary is not configured in the API'
        : 'Could not upload the images';
    throw new Error(message);
  }

  const { imageUrls } = uploadPostImagesResponseSchema.parse(
    await response.json(),
  );
  return imageUrls.slice(0, POST_MAX_IMAGES);
}
