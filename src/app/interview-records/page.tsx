'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface InterviewRecord {
  id: string
  title: string
  date: string
  preview: string
}

export default function InterviewRecords() {
  const [records, setRecords] = useState<InterviewRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: 从本地存储或API加载访谈记录
    const loadRecords = () => {
      try {
        const savedRecords = localStorage.getItem('interviewRecords')
        if (savedRecords) {
          setRecords(JSON.parse(savedRecords))
        }
      } catch (error) {
        console.error('Error loading records:', error)
        toast.error('加载访谈记录失败')
      } finally {
        setIsLoading(false)
      }
    }

    loadRecords()
  }, [])

  const handleExport = async (record: InterviewRecord) => {
    try {
      const response = await fetch(`/api/dify/export?conversationId=${record.id}`)
      if (!response.ok) throw new Error('导出失败')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `访谈记录_${record.date}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('导出成功')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('导出失败')
    }
  }

  const handleDelete = (record: InterviewRecord) => {
    try {
      const newRecords = records.filter(r => r.id !== record.id)
      setRecords(newRecords)
      localStorage.setItem('interviewRecords', JSON.stringify(newRecords))
      toast.success('删除成功')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('删除失败')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">访谈记录</h1>
        <Link href="/story-editor">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            新建访谈
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500">加载中...</div>
      ) : records.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <p className="mb-4">暂无访谈记录</p>
          <Link href="/story-editor">
            <Button variant="outline">开始第一次访谈</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <Card key={record.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{record.title || '未命名访谈'}</h3>
                  <p className="text-sm text-gray-500 mb-2">{record.date}</p>
                  <p className="text-gray-700 line-clamp-2">{record.preview}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleExport(record)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(record)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 