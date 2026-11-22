import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const item of ['index.html','src'])await cp(item,`dist/${item}`,{recursive:true});
await cp('public','dist',{recursive:true});console.log('Built static site: dist/');
