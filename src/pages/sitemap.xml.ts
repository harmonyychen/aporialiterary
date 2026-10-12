import type {APIRoute} from 'astro';
import {editorial} from '../data/content';
export const GET:APIRoute=({site})=>{const paths=['/','/about/','/shop/','/archive/','/submit/',...editorial.issues.map(i=>`/archive/${i.id}/`)];return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${new URL(p,site).href}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});};
