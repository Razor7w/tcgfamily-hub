'use client'

import { useCallback, useEffect } from 'react'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import LinkIcon from '@mui/icons-material/Link'
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

export default function TeamPostRichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe la publicación…',
  minHeight = 160
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank'
        }
      }),
      Placeholder.configure({ placeholder })
    ],
    content: value,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'team-post-editor-content'
      }
    }
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL del enlace', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: t => alpha(t.palette.text.primary, 0.12),
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        '& .team-post-editor-content': {
          outline: 'none',
          minHeight,
          px: 1.5,
          py: 1.25,
          fontSize: '0.95rem',
          lineHeight: 1.65,
          '& p': { m: 0, mb: 1 },
          '& p:last-child': { mb: 0 },
          '& h2': { fontSize: '1.15rem', fontWeight: 700, mt: 1, mb: 0.5 },
          '& h3': { fontSize: '1rem', fontWeight: 700, mt: 1, mb: 0.5 },
          '& ul, & ol': { pl: 2.5, my: 0.5 },
          '& blockquote': {
            borderLeft: '3px solid',
            borderColor: 'divider',
            pl: 1.5,
            ml: 0,
            my: 1,
            color: 'text.secondary'
          },
          '& a': { color: 'primary.main', textDecoration: 'underline' },
          '& .is-editor-empty:first-child::before': {
            color: 'text.disabled',
            content: 'attr(data-placeholder)',
            float: 'left',
            height: 0,
            pointerEvents: 'none'
          }
        }
      }}
    >
      <Stack
        direction="row"
        spacing={0.25}
        sx={{
          px: 0.5,
          py: 0.5,
          borderBottom: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.08),
          bgcolor: t => alpha(t.palette.text.primary, 0.02)
        }}
      >
        <IconButton
          size="small"
          aria-label="Negrita"
          color={editor.isActive('bold') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBoldIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Cursiva"
          color={editor.isActive('italic') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalicIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Tachado"
          color={editor.isActive('strike') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikethroughSIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Lista"
          color={editor.isActive('bulletList') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulletedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Lista numerada"
          color={editor.isActive('orderedList') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumberedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Enlace"
          color={editor.isActive('link') ? 'primary' : 'default'}
          onClick={setLink}
        >
          <LinkIcon fontSize="small" />
        </IconButton>
      </Stack>
      <EditorContent editor={editor} />
    </Box>
  )
}
