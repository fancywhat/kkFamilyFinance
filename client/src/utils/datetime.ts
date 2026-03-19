import dayjs from 'dayjs'

export function formatDateTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ''
  return dayjs(d).format('YYYY-MM-DD HH:mm:ss')
}

