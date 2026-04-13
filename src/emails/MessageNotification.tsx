import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Preview
} from '@react-email/components'

interface MessageNotificationProps {
  fromName: string
  subject?: string
  body: string
  inboxUrl: string
}

export default function MessageNotification({
  fromName,
  subject,
  body,
  inboxUrl,
}: MessageNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>{fromName} sent you a message on Novation</Preview>
      <Body style={{ backgroundColor: '#F0EDE7', fontFamily: 'DM Sans, sans-serif', margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto' }}>

          {/* Logo bar */}
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', color: '#0D1B3E', margin: 0 }}>
              KLARUM · NOVATION
            </Text>
          </Section>

          {/* Card */}
          <Section style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #E2E6F0',
            padding: '36px 40px',
          }}>
            <Text style={{ fontSize: '20px', fontWeight: 600, color: '#0D1B3E', margin: '0 0 8px 0', fontFamily: 'Georgia, serif' }}>
              New message from {fromName}
            </Text>

            {subject && (
              <Text style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
                Re: {subject}
              </Text>
            )}

            <Hr style={{ borderColor: '#E2E6F0', margin: '0 0 24px 0' }} />

            {/* Message preview */}
            <Section style={{
              borderLeft: '3px solid #3B82F6',
              paddingLeft: '16px',
              margin: '0 0 28px 0',
            }}>
              <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: 0 }}>
                {body.length > 300 ? body.slice(0, 300) + '…' : body}
              </Text>
            </Section>

            <Button
              href={inboxUrl}
              style={{
                backgroundColor: '#0D1B3E',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              View message →
            </Button>
          </Section>

          {/* Footer */}
          <Section style={{ marginTop: '24px' }}>
            <Text style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
              Novation by Klarum · You're receiving this because someone messaged you on the platform.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}