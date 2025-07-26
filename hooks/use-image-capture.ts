import { useState, useCallback } from 'react'

interface ImageCaptureOptions {
  quality?: number
  maxWidth?: number
  maxHeight?: number
}

interface ImageCaptureResult {
  file: File | null
  dataUrl: string | null
  error: string | null
}

export const useImageCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false)

  const captureFromCamera = useCallback(async (options: ImageCaptureOptions = {}): Promise<ImageCaptureResult> => {
    setIsCapturing(true)
    
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device')
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: options.maxWidth || 1920 },
          height: { ideal: options.maxHeight || 1080 }
        } 
      })

      // Create video element to capture frame
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true

      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          // Create canvas to capture frame
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')!
          
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          // Draw video frame to canvas
          context.drawImage(video, 0, 0)
          
          // Stop camera stream
          stream.getTracks().forEach(track => track.stop())
          
          // Convert to blob and file
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
              const dataUrl = canvas.toDataURL('image/jpeg', options.quality || 0.8)
              
              resolve({
                file,
                dataUrl,
                error: null
              })
            } else {
              resolve({
                file: null,
                dataUrl: null,
                error: 'Failed to capture image'
              })
            }
          }, 'image/jpeg', options.quality || 0.8)
        }
      })
    } catch (error) {
      console.error('Camera capture error:', error)
      return {
        file: null,
        dataUrl: null,
        error: error instanceof Error ? error.message : 'Failed to access camera'
      }
    } finally {
      setIsCapturing(false)
    }
  }, [])

  const selectFromGallery = useCallback(async (options: ImageCaptureOptions = {}): Promise<ImageCaptureResult> => {
    setIsCapturing(true)
    
    try {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.capture = 'environment' // Prefer camera on mobile
        
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0]
          
          if (!file) {
            resolve({
              file: null,
              dataUrl: null,
              error: 'No file selected'
            })
            return
          }

          // Validate file type
          if (!file.type.startsWith('image/')) {
            resolve({
              file: null,
              dataUrl: null,
              error: 'Please select a valid image file'
            })
            return
          }

          // Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            resolve({
              file: null,
              dataUrl: null,
              error: 'Image size must be less than 5MB'
            })
            return
          }

          // Create data URL for preview
          const reader = new FileReader()
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string
            
            // Optionally resize image
            if (options.maxWidth || options.maxHeight) {
              resizeImage(dataUrl, options).then((resizedDataUrl) => {
                // Convert back to file
                fetch(resizedDataUrl)
                  .then(res => res.blob())
                  .then(blob => {
                    const resizedFile = new File([blob], file.name, { type: file.type })
                    resolve({
                      file: resizedFile,
                      dataUrl: resizedDataUrl,
                      error: null
                    })
                  })
              })
            } else {
              resolve({
                file,
                dataUrl,
                error: null
              })
            }
          }
          
          reader.onerror = () => {
            resolve({
              file: null,
              dataUrl: null,
              error: 'Failed to read file'
            })
          }
          
          reader.readAsDataURL(file)
        }
        
        input.click()
      })
    } catch (error) {
      console.error('Gallery selection error:', error)
      return {
        file: null,
        dataUrl: null,
        error: error instanceof Error ? error.message : 'Failed to select image'
      }
    } finally {
      setIsCapturing(false)
    }
  }, [])

  const resizeImage = useCallback((dataUrl: string, options: ImageCaptureOptions): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Calculate new dimensions
        let { width, height } = img
        const maxWidth = options.maxWidth || width
        const maxHeight = options.maxHeight || height
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', options.quality || 0.8))
      }
      img.src = dataUrl
    })
  }, [])

  return {
    captureFromCamera,
    selectFromGallery,
    isCapturing
  }
}
