import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
} from 'docx'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId, projectId } = await request.json()

    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('*, observations(id, type, text, created_at, observation_files(file_type))')
      .eq('id', visitId)
      .single()

    if (visitError || !visit) {
      return NextResponse.json({ error: 'ביקור לא נמצא' }, { status: 404 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, address')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'פרויקט לא נמצא' }, { status: 404 })
    }

    const observations = (visit.observations as any[]) ?? []
    const progressObs = observations.filter((o: any) => o.type === 'progress')
    const issueObs = observations.filter((o: any) => o.type === 'issue')

    const visitDate = new Date(visit.date).toLocaleDateString('he-IL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children: [
          new Paragraph({
            text: 'HOCHMA',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: 'מערכת פיקוח פרויקטים',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: 'דוח ביקור שטח',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'פרויקט:', bold: true })] })] }),
                new TableCell({ children: [new Paragraph(project.name)] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'תאריך:', bold: true })] })] }),
                new TableCell({ children: [new Paragraph(visitDate)] }),
              ]}),
              ...(project.address ? [new TableRow({ children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'כתובת:', bold: true })] })] }),
                new TableCell({ columnSpan: 3, children: [new Paragraph(project.address)] }),
              ]})] : []),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 300 } }),

          ...(visit.summary_note ? [
            new Paragraph({ text: 'סיכום הביקור', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: visit.summary_note, spacing: { after: 300 } }),
          ] : []),

          ...(progressObs.length > 0 ? [
            new Paragraph({ text: 'תיעוד התקדמות', heading: HeadingLevel.HEADING_2 }),
            ...progressObs.map((obs: any, i: number) => new Paragraph({
              children: [
                new TextRun({ text: `${i + 1}. `, bold: true }),
                new TextRun(obs.text || '(ללא הערה טקסטואלית)'),
                ...(obs.observation_files?.filter((f: any) => f.file_type === 'photo').length > 0
                  ? [new TextRun({ text: ` [${obs.observation_files.filter((f: any) => f.file_type === 'photo').length} תמונות]`, color: '666666' })]
                  : []),
              ],
              spacing: { after: 100 },
            })),
            new Paragraph({ text: '', spacing: { after: 200 } }),
          ] : []),

          ...(issueObs.length > 0 ? [
            new Paragraph({ text: 'ממצאים וליקויים', heading: HeadingLevel.HEADING_2 }),
            ...issueObs.map((obs: any, i: number) => new Paragraph({
              children: [
                new TextRun({ text: `${i + 1}. `, bold: true }),
                new TextRun(obs.text || '(ללא תיאור)'),
                ...(obs.observation_files?.filter((f: any) => f.file_type === 'photo').length > 0
                  ? [new TextRun({ text: ` [${obs.observation_files.filter((f: any) => f.file_type === 'photo').length} תמונות]`, color: 'CC4400' })]
                  : []),
              ],
              spacing: { after: 100 },
            })),
            new Paragraph({ text: '', spacing: { after: 200 } }),
          ] : []),

          new Paragraph({
            children: [
              new TextRun({ text: `הדוח הופק ב-${new Date().toLocaleDateString('he-IL')} | HOCHMA`, color: '888888', size: 18 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
          }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="visit-report-${visit.date}.docx"`,
      },
    })
  } catch (err) {
    console.error('Report generation failed:', err)
    return NextResponse.json({ error: 'שגיאה ביצירת הדוח' }, { status: 500 })
  }
}
