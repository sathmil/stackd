import { useNavigate } from 'react-router-dom'
import { NavBar } from '../components/ui'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 500 }

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ ...serif, fontSize: 16, color: '#e8e4dc' }}>{title}</div>
      <div style={{ fontSize: 14, color: '#999', ...sans, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

export default function Privacy() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar title="Privacy Policy" onBack={() => navigate(-1)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 12, color: '#8f8f8f', ...sans }}>Last updated: July 2026</div>

        <Section title="What we collect">
          Your email and password (handled by our auth provider, Supabase -- we never see your password in plain text), profile info you choose to add (username, display name, avatar, location, goal),
          and the reviews, ratings, lists, and products you create. We also log basic usage events (e.g. search, product view, review submitted) to understand how the app is used.
        </Section>

        <Section title="How we use it">
          To run the app: show your reviews and ratings, compute aggregate scores, power search and your feed, and let you build and share lists. Usage events help us see what's working and what
          isn't. We don't use your data for advertising, and we don't sell it.
        </Section>

        <Section title="Who else sees it">
          Your username, reviews, ratings, and public lists are visible to other users -- that's the point of the app. We use a small set of service providers to run Stackd: Supabase (database, auth,
          file storage), Resend (sending account emails), and OpenAI (analyzing product ingredient lists -- only the ingredient text itself is sent, not anything tied to your identity). We don't share
          your data with anyone else.
        </Section>

        <Section title="Your rights">
          From your profile, you can export a JSON copy of your own data (profile, reviews, lists) at any time, and delete your account. Deleting your account removes your identifying info (username,
          display name, avatar, location, goal) and prevents you from logging back in; your past ratings stay in place in anonymized form so aggregate scores on products you rated don't change for
          everyone else.
        </Section>

        <Section title="Cookies & local storage">We use your browser's local storage to keep you signed in between visits. We don't use tracking cookies or third-party advertising trackers.</Section>

        <Section title="Age">Stackd isn't intended for use by children. Account creation requires confirming you're old enough to use the app given the high-caffeine products reviewed here.</Section>

        <Section title="Changes">We may update this policy as the app evolves. Meaningful changes will be reflected here with an updated date.</Section>

        <Section title="Contact">Questions about your data? Reach out to the app's operator directly.</Section>
      </div>
    </div>
  )
}
