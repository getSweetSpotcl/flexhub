import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { auth } from '@clerk/nextjs/server'

const f = createUploadthing()

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Document uploader for identity verification
  documentUploader: f({ 
    image: { 
      maxFileSize: '4MB',
      maxFileCount: 2 
    },
    pdf: {
      maxFileSize: '4MB',
      maxFileCount: 2
    }
  })
    .middleware(async ({ }) => {
      // This code runs on your server before upload
      const { userId } = await auth()

      // If you throw, the user will not be able to upload
      if (!userId) throw new UploadThingError('Unauthorized')

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log('Upload complete for userId:', metadata.userId)
      console.log('file url', file.url)
      
      // Return data to be passed to clientside onClientUploadComplete callback
      return { uploadedBy: metadata.userId, url: file.url }
    }),

  // Space image uploader
  spaceImageUploader: f({ 
    image: { 
      maxFileSize: '8MB',
      maxFileCount: 20 
    } 
  })
    .middleware(async ({ }) => {
      const { userId } = await auth()
      
      if (!userId) throw new UploadThingError('Unauthorized')
      
      // TODO: Check if user is a HOST
      
      return { userId }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Space image uploaded by:', metadata.userId)
      return { uploadedBy: metadata.userId, url: file.url }
    }),

  // Profile avatar uploader
  avatarUploader: f({ 
    image: { 
      maxFileSize: '2MB',
      maxFileCount: 1 
    } 
  })
    .middleware(async ({ }) => {
      const { userId } = await auth()
      
      if (!userId) throw new UploadThingError('Unauthorized')
      
      return { userId }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Avatar uploaded by:', metadata.userId)
      return { uploadedBy: metadata.userId, url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter