import AppShell from '@/components/AppShell'
import {requireMember,roleLabels} from '@/lib/auth/require-member'
import {createComment,createPost,deletePost,togglePin} from './actions'

type SP=Promise<{success?:string;error?:string}>
const labels:Record<string,string>={announcement:'Annonce',resource:'Ressource',question:'Question',pedagogy:'Pédagogie',meeting:'Réunion',information:'Information'}
function dt(value:string){return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Douala'}).format(new Date(value))}

export default async function WallPage({searchParams}:{searchParams:SP}){
  const {supabase,profile,isManager}=await requireMember(); const params=await searchParams
  const {data:posts}=await supabase.from('wall_posts').select('id,author_id,category,content,pinned,created_at,updated_at').order('pinned',{ascending:false}).order('created_at',{ascending:false}).limit(40)
  const postIds=(posts??[]).map((p:any)=>p.id); const comments=postIds.length?(await supabase.from('wall_comments').select('id,post_id,author_id,content,created_at').in('post_id',postIds).order('created_at')).data??[]:[]
  const authorIds=[...new Set([...(posts??[]).map((p:any)=>p.author_id),...comments.map((c:any)=>c.author_id)])]
  const authors=authorIds.length?(await supabase.from('profiles').select('id,full_name').in('id',authorIds)).data??[]:[]; const nameMap=new Map(authors.map((a:any)=>[a.id,a.full_name||'Membre']))
  return <AppShell name={profile.full_name||'Collègue'} roleLabel={roleLabels[profile.role]} active="/wall" isManager={isManager}>
    <header className="page-header"><div><p className="eyebrow">Collaboration</p><h1>Mur pédagogique</h1><p className="muted">Annonces, ressources, questions et échanges entre les membres du département.</p></div></header>
    {params.success&&<div className="notice success">{params.success}</div>}{params.error&&<div className="notice error">{params.error}</div>}
    <article className="card wall-compose"><form action={createPost}><div className="wall-compose-head"><select name="category" defaultValue="information">{Object.entries(labels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><span>Visible par tous les membres</span></div><textarea name="content" rows={3} placeholder="Que souhaitez-vous partager ?" required/><button className="primary-button">Publier</button></form></article>
    <section className="wall-feed">{(posts??[]).map((p:any)=><article className={`card wall-post ${p.pinned?'pinned':''}`} key={p.id}><div className="wall-post-head"><div><div className="wall-author"><span className="avatar-mini">{String(nameMap.get(p.author_id)||'M').slice(0,1).toUpperCase()}</span><div><strong>{nameMap.get(p.author_id)||'Membre'}</strong><span>{dt(p.created_at)}</span></div></div></div><div className="wall-tools"><span className="category-pill">{p.pinned?'📌 ':''}{labels[p.category]||p.category}</span>{isManager&&<form action={togglePin}><input type="hidden" name="post_id" value={p.id}/><input type="hidden" name="pinned" value={String(p.pinned)}/><button className="icon-button" title={p.pinned?'Désépingler':'Épingler'}>{p.pinned?'↧':'📌'}</button></form>}{(profile.id===p.author_id||isManager)&&<form action={deletePost}><input type="hidden" name="post_id" value={p.id}/><button className="icon-button danger" title="Supprimer">×</button></form>}</div></div><p className="wall-content">{p.content}</p><div className="comments">{comments.filter((c:any)=>c.post_id===p.id).map((c:any)=><div className="comment" key={c.id}><strong>{nameMap.get(c.author_id)||'Membre'}</strong><span>{c.content}</span><small>{dt(c.created_at)}</small></div>)}<form action={createComment} className="comment-form"><input type="hidden" name="post_id" value={p.id}/><input name="content" placeholder="Écrire un commentaire…" required/><button className="small-button">Envoyer</button></form></div></article>)}{!posts?.length&&<div className="card empty-state">Le mur est vide. Publie le premier message.</div>}</section>
  </AppShell>
}
