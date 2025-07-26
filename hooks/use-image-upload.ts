import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UploadResult {
  url: string | null
  error: string | null
}

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadImage = async (
    file: File,
    bucket: string = 'images',
    folder: string = 'uploads'
  ): Promise<UploadResult> => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        return {
          url: null,
          error: error.message
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      setUploadProgress(100)

      return {
        url: publicUrl,
        error: null
      }
    } catch (error) {
      console.error('Upload error:', error)
      return {
        url: null,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const uploadProfileImage = async (file: File, userId: string): Promise<UploadResult> => {
    return uploadImage(file, 'profiles', `avatars/${userId}`)
  }

  const uploadProductImage = async (file: File, sellerId: string): Promise<UploadResult> => {
    return uploadImage(file, 'products', `images/${sellerId}`)
  }

  const deleteImage = async (url: string, bucket: string = 'images'): Promise<boolean> => {
    try {
      // Extract file path from URL
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const folderPath = urlParts.slice(-2, -1)[0]
      const filePath = `${folderPath}/${fileName}`

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      if (error) {
        console.error('Delete error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete error:', error)
      return false
    }
  }

  return {
    uploadImage,
    uploadProfileImage,
    uploadProductImage,
    deleteImage,
    isUploading,
    uploadProgress
  }
}
