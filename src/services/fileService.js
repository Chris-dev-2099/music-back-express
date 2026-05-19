export const fileService = {
  uploadFile: async (bucket, key, body, contentType) => {
    return await bucket.put(key, body, {
      httpMetadata: { contentType }
    })
  },
  listFiles: async (bucket) => {
    return await bucket.list()
  },
  getFile: async (bucket, key) => {
    return await bucket.get(key)
  },
  deleteFile: async (bucket, key) => {
    return await bucket.delete(key)
  }
}
