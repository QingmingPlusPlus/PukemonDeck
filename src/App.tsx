
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface DictItem {
  [key: string]: unknown
}

function App() {
  const [data, setData] = useState<DictItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDict = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dict')
      const result = await response.json()
      if (result.status === 'success') {
        setData(result.data)
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='p-4'>
      <div className='text-amber-500 font-extrabold text-center mb-4'>test123123</div>
      <div className='flex justify-center mb-4'>
        <Button onClick={fetchDict} disabled={loading}>
          {loading ? '加载中...' : '获取 Dict 数据'}
        </Button>
      </div>
      {data.length > 0 && (
        <div className='mt-4'>
          <pre className='bg-gray-100 p-4 rounded overflow-auto'>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default App
