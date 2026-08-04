/**
 * Utility functions for image compression and Firestore payload optimization.
 * Prevents Firestore "document exceeds maximum allowed size of 1,048,576 bytes" errors.
 */

export async function compressDataUrl(dataUrl: string, maxDimension = 800, quality = 0.75): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  // If dataUrl is already small (< 120KB), return as is
  if (dataUrl.length < 120000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch (err) {
        console.warn('Error compressing image:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

export async function compressImageFile(file: File, maxDimension = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve('');
        return;
      }
      try {
        const compressed = await compressDataUrl(src, maxDimension, quality);
        resolve(compressed);
      } catch {
        resolve(src);
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Sanitizes and compresses all base64 images inside any object/document
 * before saving to Firestore to ensure it never exceeds the 1MB limit.
 */
export async function sanitizeDocForFirestore<T extends Record<string, any>>(docData: T): Promise<T> {
  if (!docData || typeof docData !== 'object') return docData;

  const clone = JSON.parse(JSON.stringify(docData));

  const processObject = async (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string' && val.startsWith('data:image/') && val.length > 80000) {
        obj[key] = await compressDataUrl(val, 800, 0.75);
      } else if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          if (typeof val[i] === 'string' && val[i].startsWith('data:image/') && val[i].length > 80000) {
            val[i] = await compressDataUrl(val[i], 800, 0.75);
          } else if (typeof val[i] === 'object' && val[i] !== null) {
            await processObject(val[i]);
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        await processObject(val);
      }
    }
  };

  await processObject(clone);

  // Safety check: Firestore document limit is 1,048,576 bytes
  let jsonStr = JSON.stringify(clone);
  if (jsonStr.length > 900000) {
    console.warn('Document payload is over 900KB, compressing images aggressively...');
    const processAggressive = async (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string' && val.startsWith('data:image/')) {
          obj[key] = await compressDataUrl(val, 400, 0.5);
        } else if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) {
            if (typeof val[i] === 'string' && val[i].startsWith('data:image/')) {
              val[i] = await compressDataUrl(val[i], 400, 0.5);
            } else if (typeof val[i] === 'object' && val[i] !== null) {
              await processAggressive(val[i]);
            }
          }
        } else if (typeof val === 'object' && val !== null) {
          await processAggressive(val);
        }
      }
    };
    await processAggressive(clone);
  }

  return clone;
}
