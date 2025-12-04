
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



  return (
    <div className='p-4'>
      <div className='flex justify-center mb-4'>
        <Button onClick={fetchDict} disabled={loading}>
          {loading ? '加载中...' : '获取 Dict 数据'}
        </Button>
      </div>
      {
        data.map((item,idx)=>{
          return <div key={idx} className='p-2 border-b'>{
            JSON.stringify(item)
          }</div>
        })
      }
      
    </div>
  )
}

export default App
