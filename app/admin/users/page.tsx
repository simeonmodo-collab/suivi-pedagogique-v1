import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/require-member'
import { createUser, updateUser } from './actions'

type SP = Promise<{success?:string;error?:string}>
const roleNames:Record<string,string>={admin:'Administrateur',pedagogical_lead:'Animateur pédagogique',teacher:'Enseignant',management_viewer:'Direction'}

export default async function UsersPage({searchParams}:{searchParams:SP}){
  const {supabase,profile}=await requireMember()
  if(profile.role!=='admin') redirect('/dashboard')
  const params=await searchParams
  const {data:profiles}=await supabase.from('profiles').select('id,full_name,email,role,active,created_at').order('full_name')
  const serviceConfigured=Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  return <main className="setup-shell"><header className="setup-header"><div><p className="eyebrow">Administration</p><h1>Utilisateurs & droits</h1><p className="muted">Crée les comptes et attribue les droits d’accès.</p></div><Link className="secondary-button" href="/dashboard">← Tableau de bord</Link></header>
  {params.success&&<div className="notice success">{params.success}</div>}{params.error&&<div className="notice error">{params.error}</div>}
  {!serviceConfigured&&<div className="notice warning">La création directe de comptes nécessite SUPABASE_SERVICE_ROLE_KEY côté serveur. Les comptes existants restent administrables.</div>}
  <section className="setup-grid"><article className="card setup-card"><div><p className="eyebrow">Nouveau compte</p><h2>Ajouter un membre</h2></div><form action={createUser} className="setup-form"><label className="setup-field"><span>Nom complet</span><input name="full_name" required/></label><label className="setup-field"><span>E-mail</span><input name="email" type="email" required/></label><label className="setup-field"><span>Mot de passe initial</span><input name="password" type="password" minLength={8} required/></label><label className="setup-field"><span>Rôle</span><select name="role" defaultValue="teacher">{Object.entries(roleNames).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><button className="primary-button" disabled={!serviceConfigured}>Créer le compte</button></form></article>
  <article className="card setup-card"><div><p className="eyebrow">Accès</p><h2>Membres de la plateforme</h2></div><div className="compact-list">{(profiles??[]).map((p:any)=><form action={updateUser} className="user-admin-row" key={p.id}><input type="hidden" name="id" value={p.id}/><div><strong>{p.full_name||p.email}</strong><span>{p.email}</span></div><select name="role" defaultValue={p.role}>{Object.entries(roleNames).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select name="active" defaultValue={String(p.active)}><option value="true">Actif</option><option value="false">Désactivé</option></select><button className="small-button">Enregistrer</button></form>)}</div></article></section></main>
}
