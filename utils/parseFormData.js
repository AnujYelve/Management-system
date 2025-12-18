/**
 * Parse multipart/form-data in Next.js App Router
 * @param {Request} request - Next.js request object
 * @returns {Promise<{fields: Object, files: Object}>}
 */
export async function parseFormData(request) {
  const formData = await request.formData();
  const fields = {};
  const files = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      files[key] = value;
    } else {
      fields[key] = value;
    }
  }

  return { fields, files };
}

/**
 * Convert File to Buffer
 * @param {File} file - File object
 * @returns {Promise<Buffer>}
 */
export async function fileToBuffer(file) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

