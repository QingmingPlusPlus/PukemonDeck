import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface DictItem {
  [key: string]: unknown
}

function App() {
  const [data, setData] = useState<DictItem[]>([])
  const [loading, setLoading] = useState(false)
  const [imageKey, setImageKey] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
  const imageCacheRef = useRef<Map<string, Blob>>(new Map())
  const imageRequestRef = useRef<AbortController | null>(null)

  const updateImagePreview = (blob: Blob) => {
    const nextUrl = URL.createObjectURL(blob)
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextUrl
    })
  }

  const fetchDict = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dict')
      const result = await response.json()
      console.log('获取的数据:', result)
      if (result.status === 'success') {
        setData(result.tables)
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchImage = async () => {
    const key = imageKey.trim().replace(/^\/+/, '')

    if (!key) {
      setImageError('请输入图片 key')
      return
    }

    const cachedBlob = imageCacheRef.current.get(key)
    if (cachedBlob) {
      setImageError('')
      updateImagePreview(cachedBlob)
      return
    }

    imageRequestRef.current?.abort()
    const controller = new AbortController()
    imageRequestRef.current = controller

    setImageLoading(true)
    setImageError('')

    try {
      const encodedKey = key
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')

      const response = await fetch(`/api/images/${encodedKey}`, {
        signal: controller.signal,
        cache: 'force-cache'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }

      const blob = await response.blob()
      imageCacheRef.current.set(key, blob)
      updateImagePreview(blob)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      console.error('获取图片失败:', error)
      setImageError('获取图片失败，请检查 key 或稍后重试')
    } finally {
      if (imageRequestRef.current === controller) {
        imageRequestRef.current = null
        setImageLoading(false)
      }
    }
  }

  useEffect(() => {
    return () => {
      imageRequestRef.current?.abort()
      imageCacheRef.current.clear()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  return (
    <div className='p-4 space-y-6'>
      <div className='flex justify-center'>
        <Button onClick={fetchDict} disabled={loading}>
          {loading ? '加载中...' : '获取 Dict 数据'}
        </Button>
      </div>

      <div className='max-w-xl mx-auto w-full'>
        <label className='block text-sm font-medium text-gray-700 mb-1'>图片 key</label>
        <input
          value={imageKey}
          onChange={(event) => setImageKey(event.target.value)}
          className='w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='例如 images/sample.png'
        />
        <div className='mt-2 flex justify-end'>
          <Button onClick={fetchImage} disabled={imageLoading}>
            {imageLoading ? '加载图片中...' : '根据 key 获取图片'}
          </Button>
        </div>
        {imageError && <p className='mt-2 text-sm text-red-500'>{imageError}</p>}
        {imageUrl && (
          <div className='mt-4 flex justify-center'>
            <img
              src={imageUrl}
              alt={`来自 key ${imageKey} 的图片`}
              className='max-h-96 rounded-lg border'
            />
          </div>
        )}
      </div>

      <div className='space-y-2'>
        {data.map((item, idx) => (
          <div key={idx} className='p-2 border rounded-md'>
            {JSON.stringify(item)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
