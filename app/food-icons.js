(function(root,factory){const data=typeof module==='object'&&module.exports?require('../content/food-icons.json'):root.BULK_DATA.foodIcons;const api=factory(data);if(typeof module==='object'&&module.exports)module.exports=api;else root.BulkFoodIcons=api;})(typeof globalThis!=='undefined'?globalThis:this,data=>{
'use strict';
function resolve(id,scope='pantry'){const key=data.aliases[scope]?.[id]||id;return data.assets[key]||data.assets['pantry-jar'];}
function html(id,scope='pantry'){const a=resolve(id,scope);return `<img class="food-art-icon" src="${a.src}" width="${a.width}" height="${a.height}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;}
return {data,resolve,html};
});
