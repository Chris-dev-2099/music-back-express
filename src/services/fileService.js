export const fileService = {
    uploadFile: async (key, body, contentType) => {
        return await env.MY_BUCKET.put(key, body, {
            httpMetadata: {contentType}
        })
    },
    listFiles: async () => {
        return await env.MY_BUCKET.list()
    },
    getFile: async (key) => {
        return await env.MY_BUCKET.get(key)
    },
    deleteFile: async (key) => {
        return await env.MY_BUCKET.delete(key)
    }
}