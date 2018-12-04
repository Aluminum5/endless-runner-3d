t1;\nvec3 t3=b3*Nx+t2;\nreturn t3;\n}\n#endif",pbrLightFunctions:"\nstruct lightingInfo\n{\nvec3 diffuse;\n#ifdef SPECULARTERM\nvec3 specular;\n#endif\n};\nstruct pointLightingInfo\n{\nvec3 lightOffset;\nfloat lightDistanceSquared;\nfloat attenuation;\n};\nstruct spotLightingInfo\n{\nvec3 lightOffset;\nfloat lightDistanceSquared;\nvec3 directionToLightCenterW;\nfloat attenuation;\n};\nfloat computeDistanceLightFalloff_Standard(vec3 lightOffset,float range)\n{\nreturn max(0.,1.0-length(lightOffset)/range);\n}\nfloat computeDistanceLightFalloff_Physical(float lightDistanceSquared)\n{\nreturn 1.0/((lightDistanceSquared+0.001));\n}\nfloat computeDistanceLightFalloff_GLTF(float lightDistanceSquared,float inverseSquaredRange)\n{\nconst float minDistanceSquared=0.01*0.01;\nfloat lightDistanceFalloff=1.0/(max(lightDistanceSquared,minDistanceSquared));\nfloat factor=lightDistanceSquared*inverseSquaredRange;\nfloat attenuation=clamp(1.0-factor*factor,0.,1.);\nattenuation*=attenuation;\n\nlightDistanceFalloff*=attenuation;\nreturn lightDistanceFalloff;\n}\nfloat computeDistanceLightFalloff(vec3 lightOffset,float lightDistanceSquared,float range,float inverseSquaredRange)\n{ \n#ifdef USEPHYSICALLIGHTFALLOFF\nreturn computeDistanceLightFalloff_Physical(lightDistanceSquared);\n#elif defined(USEGLTFLIGHTFALLOFF)\nreturn computeDistanceLightFalloff_GLTF(lightDistanceSquared,inverseSquaredRange);\n#else\nreturn computeDistanceLightFalloff_Standard(lightOffset,range);\n#endif\n}\nfloat computeDirectionalLightFalloff_Standard(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle,float exponent)\n{\nfloat falloff=0.0;\nfloat cosAngle=max(0.000000000000001,dot(-lightDirection,directionToLightCenterW));\nif (cosAngle>=cosHalfAngle)\n{\nfalloff=max(0.,pow(cosAngle,exponent));\n}\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff_Physical(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle)\n{\nconst float kMinusLog2ConeAngleIntensityRatio=6.64385618977; \n\n\n\n\n\nfloat concentrationKappa=kMinusLog2ConeAngleIntensityRatio/(1.0-cosHalfAngle);\n\n\nvec4 lightDirectionSpreadSG=vec4(-lightDirection*concentrationKappa,-concentrationKappa);\nfloat falloff=exp2(dot(vec4(directionToLightCenterW,1.0),lightDirectionSpreadSG));\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff_GLTF(vec3 lightDirection,vec3 directionToLightCenterW,float lightAngleScale,float lightAngleOffset)\n{\n\n\n\nfloat cd=dot(-lightDirection,directionToLightCenterW);\nfloat falloff=clamp(cd*lightAngleScale+lightAngleOffset,0.,1.);\n\nfalloff*=falloff;\nreturn falloff;\n}\nfloat computeDirectionalLightFalloff(vec3 lightDirection,vec3 directionToLightCenterW,float cosHalfAngle,float exponent,float lightAngleScale,float lightAngleOffset)\n{\n#ifdef USEPHYSICALLIGHTFALLOFF\nreturn computeDirectionalLightFalloff_Physical(lightDirection,directionToLightCenterW,cosHalfAngle);\n#elif defined(USEGLTFLIGHTFALLOFF)\nreturn computeDirectionalLightFalloff_GLTF(lightDirection,directionToLightCenterW,lightAngleScale,lightAngleOffset);\n#else\nreturn computeDirectionalLightFalloff_Standard(lightDirection,directionToLightCenterW,cosHalfAngle,exponent);\n#endif\n}\npointLightingInfo computePointLightingInfo(vec4 lightData) {\npointLightingInfo result;\nresult.lightOffset=lightData.xyz-vPositionW;\nresult.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);\nreturn result;\n}\nspotLightingInfo computeSpotLightingInfo(vec4 lightData) {\nspotLightingInfo result;\nresult.lightOffset=lightData.xyz-vPositionW;\nresult.directionToLightCenterW=normalize(result.lightOffset);\nresult.lightDistanceSquared=dot(result.lightOffset,result.lightOffset);\nreturn result;\n}\nlightingInfo computePointLighting(pointLightingInfo info,vec3 viewDirectionW,vec3 vNormal,vec3 diffuseColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\nfloat lightDistance=sqrt(info.lightDistanceSquared);\nvec3 lightDirection=normalize(info.lightOffset);\n\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+lightDirection);\nNdotL=clamp(dot(vNormal,lightDirection),0.00000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor*info.attenuation;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor*info.attenuation;\n#endif\nreturn result;\n}\nlightingInfo computeSpotLighting(spotLightingInfo info,vec3 viewDirectionW,vec3 vNormal,vec4 lightDirection,vec3 diffuseColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\n\nfloat lightDistance=sqrt(info.lightDistanceSquared);\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+info.directionToLightCenterW);\nNdotL=clamp(dot(vNormal,info.directionToLightCenterW),0.000000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor*info.attenuation;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor*info.attenuation;\n#endif\nreturn result;\n}\nlightingInfo computeDirectionalLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec3 diffuseColor,vec3 specularColor,float lightRadius,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\nfloat lightDistance=length(-lightData.xyz);\nvec3 lightDirection=normalize(-lightData.xyz);\n\nroughness=adjustRoughnessFromLightProperties(roughness,lightRadius,lightDistance);\n\nvec3 H=normalize(viewDirectionW+lightDirection);\nNdotL=clamp(dot(vNormal,lightDirection),0.00000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nfloat diffuseTerm=computeDiffuseTerm(NdotL,NdotV,VdotH,roughness);\nresult.diffuse=diffuseTerm*diffuseColor;\n#ifdef SPECULARTERM\n\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor;\n#endif\nreturn result;\n}\nlightingInfo computeHemisphericLighting(vec3 viewDirectionW,vec3 vNormal,vec4 lightData,vec3 diffuseColor,vec3 specularColor,vec3 groundColor,float roughness,float NdotV,vec3 reflectance0,vec3 reflectance90,float geometricRoughnessFactor,out float NdotL) {\nlightingInfo result;\n\n\n\nNdotL=dot(vNormal,lightData.xyz)*0.5+0.5;\nresult.diffuse=mix(groundColor,diffuseColor,NdotL);\n#ifdef SPECULARTERM\n\nvec3 lightVectorW=normalize(lightData.xyz);\nvec3 H=normalize(viewDirectionW+lightVectorW);\nfloat NdotH=clamp(dot(vNormal,H),0.000000000001,1.0);\nNdotL=clamp(NdotL,0.000000000001,1.0);\nfloat VdotH=clamp(dot(viewDirectionW,H),0.0,1.0);\nvec3 specTerm=computeSpecularTerm(NdotH,NdotL,NdotV,VdotH,roughness,reflectance0,reflectance90,geometricRoughnessFactor);\nresult.specular=specTerm*diffuseColor;\n#endif\nreturn result;\n}\nvec3 computeProjectionTextureDiffuseLighting(sampler2D projectionLightSampler,mat4 textureProjectionMatrix){\nvec4 strq=textureProjectionMatrix*vec4(vPositionW,1.0);\nstrq/=strq.w;\nvec3 textureColor=texture2D(projectionLightSampler,strq.xy).rgb;\nreturn toLinearSpace(textureColor);\n}",clipPlaneVertexDeclaration2:"#ifdef CLIPPLANE\nuniform vec4 vClipPlane;\nout float fClipDistance;\n#endif\n#ifdef CLIPPLANE2\nuniform vec4 vClipPlane2;\nout float fClipDistance2;\n#endif\n#ifdef CLIPPLANE3\nuniform vec4 vClipPlane3;\nout float fClipDistance3;\n#endif\n#ifdef CLIPPLANE4\nuniform vec4 vClipPlane4;\nout float fClipDistance4;\n#endif",clipPlaneFragmentDeclaration2:"#ifdef CLIPPLANE\nin float fClipDistance;\n#endif\n#ifdef CLIPPLANE2\nin float fClipDistance2;\n#endif\n#ifdef CLIPPLANE3\nin float fClipDistance3;\n#endif\n#ifdef CLIPPLANE4\nin float fClipDistance4;\n#endif",mrtFragmentDeclaration:"#if __VERSION__>=200\nlayout(location=0) out vec4 glFragData[{X}];\n#endif\n",bones300Declaration:"#if NUM_BONE_INFLUENCERS>0\nuniform mat4 mBones[BonesPerMesh];\nin vec4 matricesIndices;\nin vec4 matricesWeights;\n#if NUM_BONE_INFLUENCERS>4\nin vec4 matricesIndicesExtra;\nin vec4 matricesWeightsExtra;\n#endif\n#endif",instances300Declaration:"#ifdef INSTANCES\nin vec4 world0;\nin vec4 world1;\nin vec4 world2;\nin vec4 world3;\n#else\nuniform mat4 world;\n#endif",kernelBlurFragment:"#ifdef DOF\nfactor=sampleCoC(sampleCoord{X}); \ncomputedWeight=KERNEL_WEIGHT{X}*factor;\nsumOfWeights+=computedWeight;\n#else\ncomputedWeight=KERNEL_WEIGHT{X};\n#endif\n#ifdef PACKEDFLOAT\nblend+=unpack(texture2D(textureSampler,sampleCoord{X}))*computedWeight;\n#else\nblend+=texture2D(textureSampler,sampleCoord{X})*computedWeight;\n#endif",kernelBlurFragment2:"#ifdef DOF\nfactor=sampleCoC(sampleCenter+delta*KERNEL_DEP_OFFSET{X});\ncomputedWeight=KERNEL_DEP_WEIGHT{X}*factor;\nsumOfWeights+=computedWeight;\n#else\ncomputedWeight=KERNEL_DEP_WEIGHT{X};\n#endif\n#ifdef PACKEDFLOAT\nblend+=unpack(texture2D(textureSampler,sampleCenter+delta*KERNEL_DEP_OFFSET{X}))*computedWeight;\n#else\nblend+=texture2D(textureSampler,sampleCenter+delta*KERNEL_DEP_OFFSET{X})*computedWeight;\n#endif",kernelBlurVaryingDeclaration:"varying vec2 sampleCoord{X};",kernelBlurVertex:"sampleCoord{X}=sampleCenter+delta*KERNEL_OFFSET{X};",backgroundVertexDeclaration:"uniform mat4 view;\nuniform mat4 viewProjection;\nuniform float shadowLevel;\n#ifdef DIFFUSE\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef REFLECTION\nuniform vec2 vReflectionInfos;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\nuniform float fFovMultiplier;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif",backgroundFragmentDeclaration:" uniform vec4 vPrimaryColor;\n#ifdef USEHIGHLIGHTANDSHADOWCOLORS\nuniform vec4 vPrimaryColorShadow;\n#endif\nuniform float shadowLevel;\nuniform float alpha;\n#ifdef DIFFUSE\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef REFLECTION\nuniform vec2 vReflectionInfos;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\n#endif\n#if defined(REFLECTIONFRESNEL) || defined(OPACITYFRESNEL)\nuniform vec3 vBackgroundCenter;\n#endif\n#ifdef REFLECTIONFRESNEL\nuniform vec4 vReflectionControl;\n#endif\n#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION)\nuniform mat4 view;\n#endif",backgroundUboDeclaration:"layout(std140,column_major) uniform;\nuniform Material\n{\nuniform vec4 vPrimaryColor;\nuniform vec4 vPrimaryColorShadow;\nuniform vec2 vDiffuseInfos;\nuniform vec2 vReflectionInfos;\nuniform mat4 diffuseMatrix;\nuniform mat4 reflectionMatrix;\nuniform vec3 vReflectionMicrosurfaceInfos;\nuniform float fFovMultiplier;\nuniform float pointSize;\nuniform float shadowLevel;\nuniform float alpha;\n#if defined(REFLECTIONFRESNEL) || defined(OPACITYFRESNEL)\nuniform vec3 vBackgroundCenter;\n#endif\n#ifdef REFLECTIONFRESNEL\nuniform vec4 vReflectionControl;\n#endif\n};\nuniform Scene {\nmat4 viewProjection;\nmat4 view;\n};"},$a.CollisionWorker='var BABYLON;!function(D){var a,x=(a={root:0,found:!1},function(t,e,o,i){a.root=0,a.found=!1;var s=e*e-4*t*o;if(s<0)return a;var r=Math.sqrt(s),n=(-e-r)/(2*t),c=(-e+r)/(2*t);if(c<n){var h=c;c=n,n=h}return 0<n&&n<i?(a.root=n,a.found=!0):0<c&&c<i&&(a.root=c,a.found=!0),a}),t=function(){function t(){this._collisionPoint=D.Vector3.Zero(),this._planeIntersectionPoint=D.Vector3.Zero(),this._tempVector=D.Vector3.Zero(),this._tempVector2=D.Vector3.Zero(),this._tempVector3=D.Vector3.Zero(),this._tempVector4=D.Vector3.Zero(),this._edge=D.Vector3.Zero(),this._baseToVertex=D.Vector3.Zero(),this._destinationPoint=D.Vector3.Zero(),this._slidePlaneNormal=D.Vector3.Zero(),this._displacementVector=D.Vector3.Zero(),this._radius=D.Vector3.One(),this._retry=0,this._basePointWorld=D.Vector3.Zero(),this._velocityWorld=D.Vector3.Zero(),this._normalizedVelocity=D.Vector3.Zero(),this._collisionMask=-1}return Object.defineProperty(t.prototype,"collisionMask",{get:function(){return this._collisionMask},set:function(t){this._collisionMask=isNaN(t)?-1:t},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"slidePlaneNormal",{get:function(){return this._slidePlaneNormal},enumerable:!0,configurable:!0}),t.prototype._initialize=function(t,e,o){this._velocity=e,D.Vector3.NormalizeToRef(e,this._normalizedVelocity),(this._basePoint=t).multiplyToRef(this._radius,this._basePointWorld),e.multiplyToRef(this._radius,this._velocityWorld),this._velocityWorldLength=this._velocityWorld.length(),this._epsilon=o,this.collisionFound=!1},t.prototype._checkPointInTriangle=function(t,e,o,i,s){e.subtractToRef(t,this._tempVector),o.subtractToRef(t,this._tempVector2),D.Vector3.CrossToRef(this._tempVector,this._tempVector2,this._tempVector4);var r=D.Vector3.Dot(this._tempVector4,s);return!(r<0)&&(i.subtractToRef(t,this._tempVector3),D.Vector3.CrossToRef(this._tempVector2,this._tempVector3,this._tempVector4),!((r=D.Vector3.Dot(this._tempVector4,s))<0)&&(D.Vector3.CrossToRef(this._tempVector3,this._tempVector,this._tempVector4),0<=(r=D.Vector3.Dot(this._tempVector4,s))))},t.prototype._canDoCollision=function(t,e,o,i){var s,r,n,c,h=D.Vector3.Distance(this._basePointWorld,t),a=Math.max(this._radius.x,this._radius.y,this._radius.z);return!(h>this._velocityWorldLength+a+e)&&(s=o,r=i,n=this._basePointWorld,c=this._velocityWorldLength+a,!(s.x>n.x+c||n.x-c>r.x||s.y>n.y+c||n.y-c>r.y||s.z>n.z+c||n.z-c>r.z))},t.prototype._testTriangle=function(t,e,o,i,s,r){var n,c=!1;e||(e=[]),e[t]||(e[t]=new D.Plane(0,0,0,0),e[t].copyFromPoints(o,i,s));var h=e[t];if(r||h.isFrontFacingTo(this._normalizedVelocity,0)){var a=h.signedDistanceTo(this._basePoint),l=D.Vector3.Dot(h.normal,this._velocity);if(0==l){if(1<=Math.abs(a))return;c=!0,n=0}else{var _=(1-a)/l;if(_<(n=(-1-a)/l)){var d=_;_=n,n=d}if(1<n||_<0)return;n<0&&(n=0),1<n&&(n=1)}this._collisionPoint.copyFromFloats(0,0,0);var V=!1,u=1;if(c||(this._basePoint.subtractToRef(h.normal,this._planeIntersectionPoint),this._velocity.scaleToRef(n,this._tempVector),this._planeIntersectionPoint.addInPlace(this._tempVector),this._checkPointInTriangle(this._planeIntersectionPoint,o,i,s,h.normal)&&(V=!0,u=n,this._collisionPoint.copyFrom(this._planeIntersectionPoint))),!V){var p=this._velocity.lengthSquared(),P=p;this._basePoint.subtractToRef(o,this._tempVector);var f=2*D.Vector3.Dot(this._velocity,this._tempVector),m=this._tempVector.lengthSquared()-1,b=x(P,f,m,u);b.found&&(u=b.root,V=!0,this._collisionPoint.copyFrom(o)),this._basePoint.subtractToRef(i,this._tempVector),f=2*D.Vector3.Dot(this._velocity,this._tempVector),m=this._tempVector.lengthSquared()-1,(b=x(P,f,m,u)).found&&(u=b.root,V=!0,this._collisionPoint.copyFrom(i)),this._basePoint.subtractToRef(s,this._tempVector),f=2*D.Vector3.Dot(this._velocity,this._tempVector),m=this._tempVector.lengthSquared()-1,(b=x(P,f,m,u)).found&&(u=b.root,V=!0,this._collisionPoint.copyFrom(s)),i.subtractToRef(o,this._edge),o.subtractToRef(this._basePoint,this._baseToVertex);var y=this._edge.lengthSquared(),T=D.Vector3.Dot(this._edge,this._velocity),g=D.Vector3.Dot(this._edge,this._baseToVertex);if(P=y*-p+T*T,f=y*(2*D.Vector3.Dot(this._velocity,this._baseToVertex))-2*T*g,m=y*(1-this._baseToVertex.lengthSquared())+g*g,(b=x(P,f,m,u)).found){var v=(T*b.root-g)/y;0<=v&&v<=1&&(u=b.root,V=!0,this._edge.scaleInPlace(v),o.addToRef(this._edge,this._collisionPoint))}s.subtractToRef(i,this._edge),i.subtractToRef(this._basePoint,this._baseToVertex),y=this._edge.lengthSquared(),T=D.Vector3.Dot(this._edge,this._velocity),g=D.Vector3.Dot(this._edge,this._baseToVertex),P=y*-p+T*T,f=y*(2*D.Vector3.Dot(this._velocity,this._baseToVertex))-2*T*g,m=y*(1-this._baseToVertex.lengthSquared())+g*g,(b=x(P,f,m,u)).found&&0<=(v=(T*b.root-g)/y)&&v<=1&&(u=b.root,V=!0,this._edge.scaleInPlace(v),i.addToRef(this._edge,this._collisionPoint)),o.subtractToRef(s,this._edge),s.subtractToRef(this._basePoint,this._baseToVertex),y=this._edge.lengthSquared(),T=D.Vector3.Dot(this._edge,this._velocity),g=D.Vector3.Dot(this._edge,this._baseToVertex),P=y*-p+T*T,f=y*(2*D.Vector3.Dot(this._velocity,this._baseToVertex))-2*T*g,m=y*(1-this._baseToVertex.lengthSquared())+g*g,(b=x(P,f,m,u)).found&&0<=(v=(T*b.root-g)/y)&&v<=1&&(u=b.root,V=!0,this._edge.scaleInPlace(v),s.addToRef(this._edge,this._collisionPoint))}if(V){var R=u*this._velocity.length();(!this.collisionFound||R<this._nearestDistance)&&(this.intersectionPoint?this.intersectionPoint.copyFrom(this._collisionPoint):this.intersectionPoint=this._collisionPoint.clone(),this._nearestDistance=R,this.collisionFound=!0)}}},t.prototype._collide=function(t,e,o,i,s,r,n){for(var c=i;c<s;c+=3){var h=e[o[c]-r],a=e[o[c+1]-r],l=e[o[c+2]-r];this._testTriangle(c,t,l,a,h,n)}},t.prototype._getResponse=function(t,e){t.addToRef(e,this._destinationPoint),e.scaleInPlace(this._nearestDistance/e.length()),this._basePoint.addToRef(e,t),t.subtractToRef(this.intersectionPoint,this._slidePlaneNormal),this._slidePlaneNormal.normalize(),this._slidePlaneNormal.scaleToRef(this._epsilon,this._displacementVector),t.addInPlace(this._displacementVector),this.intersectionPoint.addInPlace(this._displacementVector),this._slidePlaneNormal.scaleInPlace(D.Plane.SignedDistanceToPlaneFromPositionAndNormal(this.intersectionPoint,this._slidePlaneNormal,this._destinationPoint)),this._destinationPoint.subtractInPlace(this._slidePlaneNormal),this._destinationPoint.subtractToRef(this.intersectionPoint,e)},t}();D.Collider=t}(BABYLON||(BABYLON={}));var BABYLON,safePostMessage=self.postMessage;!function(a){a.WorkerIncluded=!0;var i=function(){function e(){this._meshes={},this._geometries={}}return e.prototype.getMeshes=function(){return this._meshes},e.prototype.getGeometries=function(){return this._geometries},e.prototype.getMesh=function(e){return this._meshes[e]},e.prototype.addMesh=function(e){this._meshes[e.uniqueId]=e},e.prototype.removeMesh=function(e){delete this._meshes[e]},e.prototype.getGeometry=function(e){return this._geometries[e]},e.prototype.addGeometry=function(e){this._geometries[e.id]=e},e.prototype.removeGeometry=function(e){delete this._geometries[e]},e}();a.CollisionCache=i;var s=function(){function e(e,o,i){this.collider=e,this._collisionCache=o,this.finalPosition=i,this.collisionsScalingMatrix=a.Matrix.Zero(),this.collisionTranformationMatrix=a.Matrix.Zero()}return e.prototype.collideWithWorld=function(e,o,i,r){if(this.collider._retry>=i)this.finalPosition.copyFrom(e);else{this.collider._initialize(e,o,.01);for(var t,s=this._collisionCache.getMeshes(),l=Object.keys(s),n=l.length,a=0;a<n;++a)if(t=l[a],parseInt(t)!=r){var c=s[t];c.checkCollisions&&this.checkCollision(c)}this.collider.collisionFound?(0===o.x&&0===o.y&&0===o.z||this.collider._getResponse(e,o),o.length()<=.01?this.finalPosition.copyFrom(e):(this.collider._retry++,this.collideWithWorld(e,o,i,r))):e.addToRef(o,this.finalPosition)}},e.prototype.checkCollision=function(e){this.collider._canDoCollision(a.Vector3.FromArray(e.sphereCenter),e.sphereRadius,a.Vector3.FromArray(e.boxMinimum),a.Vector3.FromArray(e.boxMaximum))&&(a.Matrix.ScalingToRef(1/this.collider._radius.x,1/this.collider._radius.y,1/this.collider._radius.z,this.collisionsScalingMatrix),a.Matrix.FromArray(e.worldMatrixFromCache).multiplyToRef(this.collisionsScalingMatrix,this.collisionTranformationMatrix),this.processCollisionsForSubMeshes(this.collisionTranformationMatrix,e))},e.prototype.processCollisionsForSubMeshes=function(e,o){var i=o.subMeshes,r=i.length;if(o.geometryId){var t=this._collisionCache.getGeometry(o.geometryId);if(t)for(var s=0;s<r;s++){var l=i[s];1<r&&!this.checkSubmeshCollision(l)||(this.collideForSubMesh(l,e,t),this.collider.collisionFound&&(this.collider.collidedMesh=o.uniqueId))}else console.log("couldn\'t find geometry",o.geometryId)}else console.log("no mesh geometry id")},e.prototype.collideForSubMesh=function(e,o,i){if(!i.positionsArray){i.positionsArray=[];for(var r=0,t=i.positions.length;r<t;r+=3){var s=a.Vector3.FromArray([i.positions[r],i.positions[r+1],i.positions[r+2]]);i.positionsArray.push(s)}}if(!e._lastColliderWorldVertices||!e._lastColliderTransformMatrix.equals(o)){e._lastColliderTransformMatrix=o.clone(),e._lastColliderWorldVertices=[],e._trianglePlanes=[];var l=e.verticesStart,n=e.verticesStart+e.verticesCount;for(r=l;r<n;r++)e._lastColliderWorldVertices.push(a.Vector3.TransformCoordinates(i.positionsArray[r],o))}this.collider._collide(e._trianglePlanes,e._lastColliderWorldVertices,i.indices,e.indexStart,e.indexStart+e.indexCount,e.verticesStart,e.hasMaterial)},e.prototype.checkSubmeshCollision=function(e){return this.collider._canDoCollision(a.Vector3.FromArray(e.sphereCenter),e.sphereRadius,a.Vector3.FromArray(e.boxMinimum),a.Vector3.FromArray(e.boxMaximum))},e}();a.CollideWorker=s;var e=function(){function e(){}return e.prototype.onInit=function(e){this._collisionCache=new i;var o={error:a.WorkerReplyType.SUCCESS,taskType:a.WorkerTaskType.INIT};safePostMessage(o)},e.prototype.onUpdate=function(e){var o=this,i={error:a.WorkerReplyType.SUCCESS,taskType:a.WorkerTaskType.UPDATE};try{for(var r in e.updatedGeometries)e.updatedGeometries.hasOwnProperty(r)&&this._collisionCache.addGeometry(e.updatedGeometries[r]);for(var t in e.updatedMeshes)e.updatedMeshes.hasOwnProperty(t)&&this._collisionCache.addMesh(e.updatedMeshes[t]);e.removedGeometries.forEach(function(e){o._collisionCache.removeGeometry(e)}),e.removedMeshes.forEach(function(e){o._collisionCache.removeMesh(e)})}catch(e){i.error=a.WorkerReplyType.UNKNOWN_ERROR}safePostMessage(i)},e.prototype.onCollision=function(e){var o=a.Vector3.Zero(),i=new a.Collider;i._radius=a.Vector3.FromArray(e.collider.radius),new s(i,this._collisionCache,o).collideWithWorld(a.Vector3.FromArray(e.collider.position),a.Vector3.FromArray(e.collider.velocity),e.maximumRetry,e.excludedMeshUniqueId);var r={collidedMeshUniqueId:i.collidedMesh,collisionId:e.collisionId,newPosition:o.asArray()},t={error:a.WorkerReplyType.SUCCESS,taskType:a.WorkerTaskType.COLLIDE,payload:r};safePostMessage(t)},e}();a.CollisionDetectorTransferable=e;try{if(self&&self instanceof WorkerGlobalScope){window={},a.Collider||(importScripts("./babylon.collisionCoordinator.js"),importScripts("./babylon.collider.js"),importScripts("../Math/babylon.math.js"));var r=new e;self.onmessage=function(e){var o=e.data;switch(o.taskType){case a.WorkerTaskType.INIT:r.onInit(o.payload);break;case a.WorkerTaskType.COLLIDE:r.onCollision(o.payload);break;case a.WorkerTaskType.UPDATE:r.onUpdate(o.payload)}}}}catch(e){console.log("single worker init")}}(BABYLON||(BABYLON={}));var BABYLON;!function(c){var d,e,n,o;c.CollisionWorker="",(e=d=c.WorkerTaskType||(c.WorkerTaskType={}))[e.INIT=0]="INIT",e[e.UPDATE=1]="UPDATE",e[e.COLLIDE=2]="COLLIDE",(o=n=c.WorkerReplyType||(c.WorkerReplyType={}))[o.SUCCESS=0]="SUCCESS",o[o.UNKNOWN_ERROR=1]="UNKNOWN_ERROR";var i=function(){function o(){var s=this;this._scaledPosition=c.Vector3.Zero(),this._scaledVelocity=c.Vector3.Zero(),this.onMeshUpdated=function(e){s._addUpdateMeshesList[e.uniqueId]=o.SerializeMesh(e)},this.onGeometryUpdated=function(e){s._addUpdateGeometriesList[e.id]=o.SerializeGeometry(e)},this._afterRender=function(){if(s._init&&!(0==s._toRemoveGeometryArray.length&&0==s._toRemoveMeshesArray.length&&0==Object.keys(s._addUpdateGeometriesList).length&&0==Object.keys(s._addUpdateMeshesList).length||4<s._runningUpdated)){++s._runningUpdated;var e={updatedMeshes:s._addUpdateMeshesList,updatedGeometries:s._addUpdateGeometriesList,removedGeometries:s._toRemoveGeometryArray,removedMeshes:s._toRemoveMeshesArray},o={payload:e,taskType:d.UPDATE},i=[];for(var t in e.updatedGeometries)e.updatedGeometries.hasOwnProperty(t)&&(i.push(o.payload.updatedGeometries[t].indices.buffer),i.push(o.payload.updatedGeometries[t].normals.buffer),i.push(o.payload.updatedGeometries[t].positions.buffer));s._worker.postMessage(o,i),s._addUpdateMeshesList={},s._addUpdateGeometriesList={},s._toRemoveGeometryArray=[],s._toRemoveMeshesArray=[]}},this._onMessageFromWorker=function(e){var o=e.data;if(o.error==n.SUCCESS)switch(o.taskType){case d.INIT:s._init=!0,s._scene.meshes.forEach(function(e){s.onMeshAdded(e)}),s._scene.getGeometries().forEach(function(e){s.onGeometryAdded(e)});break;case d.UPDATE:s._runningUpdated--;break;case d.COLLIDE:var i=o.payload;if(!s._collisionsCallbackArray[i.collisionId])return;var t=s._collisionsCallbackArray[i.collisionId];if(t){var r=s._scene.getMeshByUniqueID(i.collidedMeshUniqueId);r&&t(i.collisionId,c.Vector3.FromArray(i.newPosition),r)}s._collisionsCallbackArray[i.collisionId]=null}else c.Tools.Warn("error returned from worker!")},this._collisionsCallbackArray=[],this._init=!1,this._runningUpdated=0,this._addUpdateMeshesList={},this._addUpdateGeometriesList={},this._toRemoveGeometryArray=[],this._toRemoveMeshesArray=[]}return o.prototype.getNewPosition=function(e,o,i,t,r,s,n){if(this._init&&!this._collisionsCallbackArray[n]&&!this._collisionsCallbackArray[n+1e5]){e.divideToRef(i._radius,this._scaledPosition),o.divideToRef(i._radius,this._scaledVelocity),this._collisionsCallbackArray[n]=s;var a={payload:{collider:{position:this._scaledPosition.asArray(),velocity:this._scaledVelocity.asArray(),radius:i._radius.asArray()},collisionId:n,excludedMeshUniqueId:r?r.uniqueId:null,maximumRetry:t},taskType:d.COLLIDE};this._worker.postMessage(a)}},o.prototype.init=function(e){this._scene=e,this._scene.registerAfterRender(this._afterRender);var o=c.WorkerIncluded?c.Engine.CodeRepository+"Collisions/babylon.collisionWorker.js":URL.createObjectURL(new Blob([c.CollisionWorker],{type:"application/javascript"}));this._worker=new Worker(o),this._worker.onmessage=this._onMessageFromWorker;var i={payload:{},taskType:d.INIT};this._worker.postMessage(i)},o.prototype.destroy=function(){this._scene.unregisterAfterRender(this._afterRender),this._worker.terminate()},o.prototype.onMeshAdded=function(e){e.registerAfterWorldMatrixUpdate(this.onMeshUpdated),this.onMeshUpdated(e)},o.prototype.onMeshRemoved=function(e){this._toRemoveMeshesArray.push(e.uniqueId)},o.prototype.onGeometryAdded=function(e){e.onGeometryUpdated=this.onGeometryUpdated,this.onGeometryUpdated(e)},o.prototype.onGeometryDeleted=function(e){this._toRemoveGeometryArray.push(e.id)},o.SerializeMesh=function(e){var o=[];e.subMeshes&&(o=e.subMeshes.map(function(e,o){var i=e.getBoundingInfo();return{position:o,verticesStart:e.verticesStart,verticesCount:e.verticesCount,indexStart:e.indexStart,indexCount:e.indexCount,hasMaterial:!!e.getMaterial(),sphereCenter:i.boundingSphere.centerWorld.asArray(),sphereRadius:i.boundingSphere.radiusWorld,boxMinimum:i.boundingBox.minimumWorld.asArray(),boxMaximum:i.boundingBox.maximumWorld.asArray()}}));var i=null;if(e instanceof c.Mesh)i=(t=e.geometry)?t.id:null;else if(e instanceof c.InstancedMesh){var t;i=(t=e.sourceMesh&&e.sourceMesh.geometry)?t.id:null}var r=e.getBoundingInfo();return{uniqueId:e.uniqueId,id:e.id,name:e.name,geometryId:i,sphereCenter:r.boundingSphere.centerWorld.asArray(),sphereRadius:r.boundingSphere.radiusWorld,boxMinimum:r.boundingBox.minimumWorld.asArray(),boxMaximum:r.boundingBox.maximumWorld.asArray(),worldMatrixFromCache:e.worldMatrixFromCache.asArray(),subMeshes:o,checkCollisions:e.checkCollisions}},o.SerializeGeometry=function(e){return{id:e.id,positions:new Float32Array(e.getVerticesData(c.VertexBuffer.PositionKind)||[]),normals:new Float32Array(e.getVerticesData(c.VertexBuffer.NormalKind)||[]),indices:new Uint32Array(e.getIndices()||[])}},o}();c.CollisionCoordinatorWorker=i;var t=function(){function e(){this._scaledPosition=c.Vector3.Zero(),this._scaledVelocity=c.Vector3.Zero(),this._finalPosition=c.Vector3.Zero()}return e.prototype.getNewPosition=function(e,o,i,t,r,s,n){e.divideToRef(i._radius,this._scaledPosition),o.divideToRef(i._radius,this._scaledVelocity),i.collidedMesh=null,i._retry=0,i._initialVelocity=this._scaledVelocity,i._initialPosition=this._scaledPosition,this._collideWithWorld(this._scaledPosition,this._scaledVelocity,i,t,this._finalPosition,r),this._finalPosition.multiplyInPlace(i._radius),s(n,this._finalPosition,i.collidedMesh)},e.prototype.init=function(e){this._scene=e},e.prototype.destroy=function(){},e.prototype.onMeshAdded=function(e){},e.prototype.onMeshUpdated=function(e){},e.prototype.onMeshRemoved=function(e){},e.prototype.onGeometryAdded=function(e){},e.prototype.onGeometryUpdated=function(e){},e.prototype.onGeometryDeleted=function(e){},e.prototype._collideWithWorld=function(e,o,i,t,r,s){void 0===s&&(s=null);var n=10*c.Engine.CollisionsEpsilon;if(i._retry>=t)r.copyFrom(e);else{var a=s?s.collisionMask:i.collisionMask;i._initialize(e,o,n);for(var d=0;d<this._scene.meshes.length;d++){var l=this._scene.meshes[d];l.isEnabled()&&l.checkCollisions&&l.subMeshes&&l!==s&&0!=(a&l.collisionGroup)&&l._checkCollision(i)}i.collisionFound?(0===o.x&&0===o.y&&0===o.z||i._getResponse(e,o),o.length()<=n?r.copyFrom(e):(i._retry++,this._collideWithWorld(e,o,i,t,r,s))):e.addToRef(o,r)}},e}();c.CollisionCoordinatorLegacy=t}(BABYLON||(BABYLON={}));var BABYLON;!function(p){p.ToGammaSpace=1/2.2,p.ToLinearSpace=2.2,p.Epsilon=.001;var i=function(){function n(t,i,r){void 0===t&&(t=0),void 0===i&&(i=0),void 0===r&&(r=0),this.r=t,this.g=i,this.b=r}return n.prototype.toString=function(){return"{R: "+this.r+" G:"+this.g+" B:"+this.b+"}"},n.prototype.getClassName=function(){return"Color3"},n.prototype.getHashCode=function(){var t=this.r||0;return t=397*(t=397*t^(this.g||0))^(this.b||0)},n.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.r,t[i+1]=this.g,t[i+2]=this.b,this},n.prototype.toColor4=function(t){return void 0===t&&(t=1),new r(this.r,this.g,this.b,t)},n.prototype.asArray=function(){var t=new Array;return this.toArray(t,0),t},n.prototype.toLuminance=function(){return.3*this.r+.59*this.g+.11*this.b},n.prototype.multiply=function(t){return new n(this.r*t.r,this.g*t.g,this.b*t.b)},n.prototype.multiplyToRef=function(t,i){return i.r=this.r*t.r,i.g=this.g*t.g,i.b=this.b*t.b,this},n.prototype.equals=function(t){return t&&this.r===t.r&&this.g===t.g&&this.b===t.b},n.prototype.equalsFloats=function(t,i,r){return this.r===t&&this.g===i&&this.b===r},n.prototype.scale=function(t){return new n(this.r*t,this.g*t,this.b*t)},n.prototype.scaleToRef=function(t,i){return i.r=this.r*t,i.g=this.g*t,i.b=this.b*t,this},n.prototype.scaleAndAddToRef=function(t,i){return i.r+=this.r*t,i.g+=this.g*t,i.b+=this.b*t,this},n.prototype.clampToRef=function(t,i,r){return void 0===t&&(t=0),void 0===i&&(i=1),r.r=p.Scalar.Clamp(this.r,t,i),r.g=p.Scalar.Clamp(this.g,t,i),r.b=p.Scalar.Clamp(this.b,t,i),this},n.prototype.add=function(t){return new n(this.r+t.r,this.g+t.g,this.b+t.b)},n.prototype.addToRef=function(t,i){return i.r=this.r+t.r,i.g=this.g+t.g,i.b=this.b+t.b,this},n.prototype.subtract=function(t){return new n(this.r-t.r,this.g-t.g,this.b-t.b)},n.prototype.subtractToRef=function(t,i){return i.r=this.r-t.r,i.g=this.g-t.g,i.b=this.b-t.b,this},n.prototype.clone=function(){return new n(this.r,this.g,this.b)},n.prototype.copyFrom=function(t){return this.r=t.r,this.g=t.g,this.b=t.b,this},n.prototype.copyFromFloats=function(t,i,r){return this.r=t,this.g=i,this.b=r,this},n.prototype.set=function(t,i,r){return this.copyFromFloats(t,i,r)},n.prototype.toHexString=function(){var t=255*this.r|0,i=255*this.g|0,r=255*this.b|0;return"#"+p.Scalar.ToHex(t)+p.Scalar.ToHex(i)+p.Scalar.ToHex(r)},n.prototype.toLinearSpace=function(){var t=new n;return this.toLinearSpaceToRef(t),t},n.prototype.toLinearSpaceToRef=function(t){return t.r=Math.pow(this.r,p.ToLinearSpace),t.g=Math.pow(this.g,p.ToLinearSpace),t.b=Math.pow(this.b,p.ToLinearSpace),this},n.prototype.toGammaSpace=function(){var t=new n;return this.toGammaSpaceToRef(t),t},n.prototype.toGammaSpaceToRef=function(t){return t.r=Math.pow(this.r,p.ToGammaSpace),t.g=Math.pow(this.g,p.ToGammaSpace),t.b=Math.pow(this.b,p.ToGammaSpace),this},n.FromHexString=function(t){if("#"!==t.substring(0,1)||7!==t.length)return new n(0,0,0);var i=parseInt(t.substring(1,3),16),r=parseInt(t.substring(3,5),16),o=parseInt(t.substring(5,7),16);return n.FromInts(i,r,o)},n.FromArray=function(t,i){return void 0===i&&(i=0),new n(t[i],t[i+1],t[i+2])},n.FromInts=function(t,i,r){return new n(t/255,i/255,r/255)},n.Lerp=function(t,i,r){var o=new n(0,0,0);return n.LerpToRef(t,i,r,o),o},n.LerpToRef=function(t,i,r,o){o.r=t.r+(i.r-t.r)*r,o.g=t.g+(i.g-t.g)*r,o.b=t.b+(i.b-t.b)*r},n.Red=function(){return new n(1,0,0)},n.Green=function(){return new n(0,1,0)},n.Blue=function(){return new n(0,0,1)},n.Black=function(){return new n(0,0,0)},n.White=function(){return new n(1,1,1)},n.Purple=function(){return new n(.5,0,.5)},n.Magenta=function(){return new n(1,0,1)},n.Yellow=function(){return new n(1,1,0)},n.Gray=function(){return new n(.5,.5,.5)},n.Teal=function(){return new n(0,1,1)},n.Random=function(){return new n(Math.random(),Math.random(),Math.random())},n}();p.Color3=i;var r=function(){function e(t,i,r,o){void 0===t&&(t=0),void 0===i&&(i=0),void 0===r&&(r=0),void 0===o&&(o=1),this.r=t,this.g=i,this.b=r,this.a=o}return e.prototype.addInPlace=function(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this.a+=t.a,this},e.prototype.asArray=function(){var t=new Array;return this.toArray(t,0),t},e.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.r,t[i+1]=this.g,t[i+2]=this.b,t[i+3]=this.a,this},e.prototype.add=function(t){return new e(this.r+t.r,this.g+t.g,this.b+t.b,this.a+t.a)},e.prototype.subtract=function(t){return new e(this.r-t.r,this.g-t.g,this.b-t.b,this.a-t.a)},e.prototype.subtractToRef=function(t,i){return i.r=this.r-t.r,i.g=this.g-t.g,i.b=this.b-t.b,i.a=this.a-t.a,this},e.prototype.scale=function(t){return new e(this.r*t,this.g*t,this.b*t,this.a*t)},e.prototype.scaleToRef=function(t,i){return i.r=this.r*t,i.g=this.g*t,i.b=this.b*t,i.a=this.a*t,this},e.prototype.scaleAndAddToRef=function(t,i){return i.r+=this.r*t,i.g+=this.g*t,i.b+=this.b*t,i.a+=this.a*t,this},e.prototype.clampToRef=function(t,i,r){return void 0===t&&(t=0),void 0===i&&(i=1),r.r=p.Scalar.Clamp(this.r,t,i),r.g=p.Scalar.Clamp(this.g,t,i),r.b=p.Scalar.Clamp(this.b,t,i),r.a=p.Scalar.Clamp(this.a,t,i),this},e.prototype.multiply=function(t){return new e(this.r*t.r,this.g*t.g,this.b*t.b,this.a*t.a)},e.prototype.multiplyToRef=function(t,i){return i.r=this.r*t.r,i.g=this.g*t.g,i.b=this.b*t.b,i.a=this.a*t.a,i},e.prototype.toString=function(){return"{R: "+this.r+" G:"+this.g+" B:"+this.b+" A:"+this.a+"}"},e.prototype.getClassName=function(){return"Color4"},e.prototype.getHashCode=function(){var t=this.r||0;return t=397*(t=397*(t=397*t^(this.g||0))^(this.b||0))^(this.a||0)},e.prototype.clone=function(){return new e(this.r,this.g,this.b,this.a)},e.prototype.copyFrom=function(t){return this.r=t.r,this.g=t.g,this.b=t.b,this.a=t.a,this},e.prototype.copyFromFloats=function(t,i,r,o){return this.r=t,this.g=i,this.b=r,this.a=o,this},e.prototype.set=function(t,i,r,o){return this.copyFromFloats(t,i,r,o)},e.prototype.toHexString=function(){var t=255*this.r|0,i=255*this.g|0,r=255*this.b|0,o=255*this.a|0;return"#"+p.Scalar.ToHex(t)+p.Scalar.ToHex(i)+p.Scalar.ToHex(r)+p.Scalar.ToHex(o)},e.prototype.toLinearSpace=function(){var t=new e;return this.toLinearSpaceToRef(t),t},e.prototype.toLinearSpaceToRef=function(t){return t.r=Math.pow(this.r,p.ToLinearSpace),t.g=Math.pow(this.g,p.ToLinearSpace),t.b=Math.pow(this.b,p.ToLinearSpace),t.a=this.a,this},e.prototype.toGammaSpace=function(){var t=new e;return this.toGammaSpaceToRef(t),t},e.prototype.toGammaSpaceToRef=function(t){return t.r=Math.pow(this.r,p.ToGammaSpace),t.g=Math.pow(this.g,p.ToGammaSpace),t.b=Math.pow(this.b,p.ToGammaSpace),t.a=this.a,this},e.FromHexString=function(t){if("#"!==t.substring(0,1)||9!==t.length)return new e(0,0,0,0);var i=parseInt(t.substring(1,3),16),r=parseInt(t.substring(3,5),16),o=parseInt(t.substring(5,7),16),n=parseInt(t.substring(7,9),16);return e.FromInts(i,r,o,n)},e.Lerp=function(t,i,r){var o=new e(0,0,0,0);return e.LerpToRef(t,i,r,o),o},e.LerpToRef=function(t,i,r,o){o.r=t.r+(i.r-t.r)*r,o.g=t.g+(i.g-t.g)*r,o.b=t.b+(i.b-t.b)*r,o.a=t.a+(i.a-t.a)*r},e.FromColor3=function(t,i){return void 0===i&&(i=1),new e(t.r,t.g,t.b,i)},e.FromArray=function(t,i){return void 0===i&&(i=0),new e(t[i],t[i+1],t[i+2],t[i+3])},e.FromInts=function(t,i,r,o){return new e(t/255,i/255,r/255,o/255)},e.CheckColors4=function(t,i){if(t.length===3*i){for(var r=[],o=0;o<t.length;o+=3){var n=o/3*4;r[n]=t[o],r[n+1]=t[o+1],r[n+2]=t[o+2],r[n+3]=1}return r}return t},e}();p.Color4=r;var f=function(){function y(t,i){void 0===t&&(t=0),void 0===i&&(i=0),this.x=t,this.y=i}return y.prototype.toString=function(){return"{X: "+this.x+" Y:"+this.y+"}"},y.prototype.getClassName=function(){return"Vector2"},y.prototype.getHashCode=function(){var t=this.x||0;return t=397*t^(this.y||0)},y.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.x,t[i+1]=this.y,this},y.prototype.asArray=function(){var t=new Array;return this.toArray(t,0),t},y.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this},y.prototype.copyFromFloats=function(t,i){return this.x=t,this.y=i,this},y.prototype.set=function(t,i){return this.copyFromFloats(t,i)},y.prototype.add=function(t){return new y(this.x+t.x,this.y+t.y)},y.prototype.addToRef=function(t,i){return i.x=this.x+t.x,i.y=this.y+t.y,this},y.prototype.addInPlace=function(t){return this.x+=t.x,this.y+=t.y,this},y.prototype.addVector3=function(t){return new y(this.x+t.x,this.y+t.y)},y.prototype.subtract=function(t){return new y(this.x-t.x,this.y-t.y)},y.prototype.subtractToRef=function(t,i){return i.x=this.x-t.x,i.y=this.y-t.y,this},y.prototype.subtractInPlace=function(t){return this.x-=t.x,this.y-=t.y,this},y.prototype.multiplyInPlace=function(t){return this.x*=t.x,this.y*=t.y,this},y.prototype.multiply=function(t){return new y(this.x*t.x,this.y*t.y)},y.prototype.multiplyToRef=function(t,i){return i.x=this.x*t.x,i.y=this.y*t.y,this},y.prototype.multiplyByFloats=function(t,i){return new y(this.x*t,this.y*i)},y.prototype.divide=function(t){return new y(this.x/t.x,this.y/t.y)},y.prototype.divideToRef=function(t,i){return i.x=this.x/t.x,i.y=this.y/t.y,this},y.prototype.divideInPlace=function(t){return this.divideToRef(t,this)},y.prototype.negate=function(){return new y(-this.x,-this.y)},y.prototype.scaleInPlace=function(t){return this.x*=t,this.y*=t,this},y.prototype.scale=function(t){var i=new y(0,0);return this.scaleToRef(t,i),i},y.prototype.scaleToRef=function(t,i){return i.x=this.x*t,i.y=this.y*t,this},y.prototype.scaleAndAddToRef=function(t,i){return i.x+=this.x*t,i.y+=this.y*t,this},y.prototype.equals=function(t){return t&&this.x===t.x&&this.y===t.y},y.prototype.equalsWithEpsilon=function(t,i){return void 0===i&&(i=p.Epsilon),t&&p.Scalar.WithinEpsilon(this.x,t.x,i)&&p.Scalar.WithinEpsilon(this.y,t.y,i)},y.prototype.floor=function(){return new y(Math.floor(this.x),Math.floor(this.y))},y.prototype.fract=function(){return new y(this.x-Math.floor(this.x),this.y-Math.floor(this.y))},y.prototype.length=function(){return Math.sqrt(this.x*this.x+this.y*this.y)},y.prototype.lengthSquared=function(){return this.x*this.x+this.y*this.y},y.prototype.normalize=function(){var t=this.length();if(0===t)return this;var i=1/t;return this.x*=i,this.y*=i,this},y.prototype.clone=function(){return new y(this.x,this.y)},y.Zero=function(){return new y(0,0)},y.One=function(){return new y(1,1)},y.FromArray=function(t,i){return void 0===i&&(i=0),new y(t[i],t[i+1])},y.FromArrayToRef=function(t,i,r){r.x=t[i],r.y=t[i+1]},y.CatmullRom=function(t,i,r,o,n){var e=n*n,s=n*e;return new y(.5*(2*i.x+(-t.x+r.x)*n+(2*t.x-5*i.x+4*r.x-o.x)*e+(-t.x+3*i.x-3*r.x+o.x)*s),.5*(2*i.y+(-t.y+r.y)*n+(2*t.y-5*i.y+4*r.y-o.y)*e+(-t.y+3*i.y-3*r.y+o.y)*s))},y.Clamp=function(t,i,r){var o=t.x;o=(o=o>r.x?r.x:o)<i.x?i.x:o;var n=t.y;return new y(o,n=(n=n>r.y?r.y:n)<i.y?i.y:n)},y.Hermite=function(t,i,r,o,n){var e=n*n,s=n*e,h=2*s-3*e+1,a=-2*s+3*e,u=s-2*e+n,m=s-e;return new y(t.x*h+r.x*a+i.x*u+o.x*m,t.y*h+r.y*a+i.y*u+o.y*m)},y.Lerp=function(t,i,r){return new y(t.x+(i.x-t.x)*r,t.y+(i.y-t.y)*r)},y.Dot=function(t,i){return t.x*i.x+t.y*i.y},y.Normalize=function(t){var i=t.clone();return i.normalize(),i},y.Minimize=function(t,i){return new y(t.x<i.x?t.x:i.x,t.y<i.y?t.y:i.y)},y.Maximize=function(t,i){return new y(t.x>i.x?t.x:i.x,t.y>i.y?t.y:i.y)},y.Transform=function(t,i){var r=y.Zero();return y.TransformToRef(t,i,r),r},y.TransformToRef=function(t,i,r){var o=t.x*i.m[0]+t.y*i.m[4]+i.m[12],n=t.x*i.m[1]+t.y*i.m[5]+i.m[13];r.x=o,r.y=n},y.PointInTriangle=function(t,i,r,o){var n=.5*(-r.y*o.x+i.y*(-r.x+o.x)+i.x*(r.y-o.y)+r.x*o.y),e=n<0?-1:1,s=(i.y*o.x-i.x*o.y+(o.y-i.y)*t.x+(i.x-o.x)*t.y)*e,h=(i.x*r.y-i.y*r.x+(i.y-r.y)*t.x+(r.x-i.x)*t.y)*e;return 0<s&&0<h&&s+h<2*n*e},y.Distance=function(t,i){return Math.sqrt(y.DistanceSquared(t,i))},y.DistanceSquared=function(t,i){var r=t.x-i.x,o=t.y-i.y;return r*r+o*o},y.Center=function(t,i){var r=t.add(i);return r.scaleInPlace(.5),r},y.DistanceOfPointFromSegment=function(t,i,r){var o=y.DistanceSquared(i,r);if(0===o)return y.Distance(t,i);var n=r.subtract(i),e=Math.max(0,Math.min(1,y.Dot(t.subtract(i),n)/o)),s=i.add(n.multiplyByFloats(e,e));return y.Distance(t,s)},y}();p.Vector2=f;var l=function(){function c(t,i,r){void 0===t&&(t=0),void 0===i&&(i=0),void 0===r&&(r=0),this.x=t,this.y=i,this.z=r}return c.prototype.toString=function(){return"{X: "+this.x+" Y:"+this.y+" Z:"+this.z+"}"},c.prototype.getClassName=function(){return"Vector3"},c.prototype.getHashCode=function(){var t=this.x||0;return t=397*(t=397*t^(this.y||0))^(this.z||0)},c.prototype.asArray=function(){var t=[];return this.toArray(t,0),t},c.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.x,t[i+1]=this.y,t[i+2]=this.z,this},c.prototype.toQuaternion=function(){return p.Quaternion.RotationYawPitchRoll(this.x,this.y,this.z)},c.prototype.addInPlace=function(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this},c.prototype.add=function(t){return new c(this.x+t.x,this.y+t.y,this.z+t.z)},c.prototype.addToRef=function(t,i){return i.x=this.x+t.x,i.y=this.y+t.y,i.z=this.z+t.z,this},c.prototype.subtractInPlace=function(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this},c.prototype.subtract=function(t){return new c(this.x-t.x,this.y-t.y,this.z-t.z)},c.prototype.subtractToRef=function(t,i){return i.x=this.x-t.x,i.y=this.y-t.y,i.z=this.z-t.z,this},c.prototype.subtractFromFloats=function(t,i,r){return new c(this.x-t,this.y-i,this.z-r)},c.prototype.subtractFromFloatsToRef=function(t,i,r,o){return o.x=this.x-t,o.y=this.y-i,o.z=this.z-r,this},c.prototype.negate=function(){return new c(-this.x,-this.y,-this.z)},c.prototype.scaleInPlace=function(t){return this.x*=t,this.y*=t,this.z*=t,this},c.prototype.scale=function(t){return new c(this.x*t,this.y*t,this.z*t)},c.prototype.scaleToRef=function(t,i){return i.x=this.x*t,i.y=this.y*t,i.z=this.z*t,this},c.prototype.scaleAndAddToRef=function(t,i){return i.x+=this.x*t,i.y+=this.y*t,i.z+=this.z*t,this},c.prototype.equals=function(t){return t&&this.x===t.x&&this.y===t.y&&this.z===t.z},c.prototype.equalsWithEpsilon=function(t,i){return void 0===i&&(i=p.Epsilon),t&&p.Scalar.WithinEpsilon(this.x,t.x,i)&&p.Scalar.WithinEpsilon(this.y,t.y,i)&&p.Scalar.WithinEpsilon(this.z,t.z,i)},c.prototype.equalsToFloats=function(t,i,r){return this.x===t&&this.y===i&&this.z===r},c.prototype.multiplyInPlace=function(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this},c.prototype.multiply=function(t){return new c(this.x*t.x,this.y*t.y,this.z*t.z)},c.prototype.multiplyToRef=function(t,i){return i.x=this.x*t.x,i.y=this.y*t.y,i.z=this.z*t.z,this},c.prototype.multiplyByFloats=function(t,i,r){return new c(this.x*t,this.y*i,this.z*r)},c.prototype.divide=function(t){return new c(this.x/t.x,this.y/t.y,this.z/t.z)},c.prototype.divideToRef=function(t,i){return i.x=this.x/t.x,i.y=this.y/t.y,i.z=this.z/t.z,this},c.prototype.divideInPlace=function(t){return this.divideToRef(t,this)},c.prototype.minimizeInPlace=function(t){return this.minimizeInPlaceFromFloats(t.x,t.y,t.z)},c.prototype.maximizeInPlace=function(t){return this.maximizeInPlaceFromFloats(t.x,t.y,t.z)},c.prototype.minimizeInPlaceFromFloats=function(t,i,r){return t<this.x&&(this.x=t),i<this.y&&(this.y=i),r<this.z&&(this.z=r),this},c.prototype.maximizeInPlaceFromFloats=function(t,i,r){return t>this.x&&(this.x=t),i>this.y&&(this.y=i),r>this.z&&(this.z=r),this},Object.defineProperty(c.prototype,"isNonUniform",{get:function(){var t=Math.abs(this.x),i=Math.abs(this.y);if(t!==i)return!0;var r=Math.abs(this.z);return t!==r||i!==r},enumerable:!0,configurable:!0}),c.prototype.floor=function(){return new c(Math.floor(this.x),Math.floor(this.y),Math.floor(this.z))},c.prototype.fract=function(){return new c(this.x-Math.floor(this.x),this.y-Math.floor(this.y),this.z-Math.floor(this.z))},c.prototype.length=function(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)},c.prototype.lengthSquared=function(){return this.x*this.x+this.y*this.y+this.z*this.z},c.prototype.normalize=function(){var t=this.length();if(0===t||1===t)return this;var i=1/t;return this.x*=i,this.y*=i,this.z*=i,this},c.prototype.normalizeToNew=function(){var t=new c(0,0,0);return this.normalizeToRef(t),t},c.prototype.normalizeToRef=function(t){var i=this.length();if(0===i||1===i)return t.set(this.x,this.y,this.z),t;var r=1/i;return this.scaleToRef(r,t),t},c.prototype.clone=function(){return new c(this.x,this.y,this.z)},c.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this.z=t.z,this},c.prototype.copyFromFloats=function(t,i,r){return this.x=t,this.y=i,this.z=r,this},c.prototype.set=function(t,i,r){return this.copyFromFloats(t,i,r)},c.GetClipFactor=function(t,i,r,o){var n=c.Dot(t,r)-o;return n/(n-(c.Dot(i,r)-o))},c.GetAngleBetweenVectors=function(t,i,r){var o=_.Vector3[1].copyFrom(t).normalize(),n=_.Vector3[2].copyFrom(i).normalize(),e=c.Dot(o,n),s=_.Vector3[3];return c.CrossToRef(o,n,s),0<c.Dot(s,r)?Math.acos(e):-Math.acos(e)},c.FromArray=function(t,i){return i||(i=0),new c(t[i],t[i+1],t[i+2])},c.FromFloatArray=function(t,i){return c.FromArray(t,i)},c.FromArrayToRef=function(t,i,r){r.x=t[i],r.y=t[i+1],r.z=t[i+2]},c.FromFloatArrayToRef=function(t,i,r){return c.FromArrayToRef(t,i,r)},c.FromFloatsToRef=function(t,i,r,o){o.x=t,o.y=i,o.z=r},c.Zero=function(){return new c(0,0,0)},c.One=function(){return new c(1,1,1)},c.Up=function(){return new c(0,1,0)},c.Down=function(){return new c(0,-1,0)},c.Forward=function(){return new c(0,0,1)},c.Backward=function(){return new c(0,0,-1)},c.Right=function(){return new c(1,0,0)},c.Left=function(){return new c(-1,0,0)},c.TransformCoordinates=function(t,i){var r=c.Zero();return c.TransformCoordinatesToRef(t,i,r),r},c.TransformCoordinatesToRef=function(t,i,r){var o=t.x*i.m[0]+t.y*i.m[4]+t.z*i.m[8]+i.m[12],n=t.x*i.m[1]+t.y*i.m[5]+t.z*i.m[9]+i.m[13],e=t.x*i.m[2]+t.y*i.m[6]+t.z*i.m[10]+i.m[14],s=t.x*i.m[3]+t.y*i.m[7]+t.z*i.m[11]+i.m[15];r.x=o/s,r.y=n/s,r.z=e/s},c.TransformCoordinatesFromFloatsToRef=function(t,i,r,o,n){var e=t*o.m[0]+i*o.m[4]+r*o.m[8]+o.m[12],s=t*o.m[1]+i*o.m[5]+r*o.m[9]+o.m[13],h=t*o.m[2]+i*o.m[6]+r*o.m[10]+o.m[14],a=t*o.m[3]+i*o.m[7]+r*o.m[11]+o.m[15];n.x=e/a,n.y=s/a,n.z=h/a},c.TransformNormal=function(t,i){var r=c.Zero();return c.TransformNormalToRef(t,i,r),r},c.TransformNormalToRef=function(t,i,r){var o=t.x*i.m[0]+t.y*i.m[4]+t.z*i.m[8],n=t.x*i.m[1]+t.y*i.m[5]+t.z*i.m[9],e=t.x*i.m[2]+t.y*i.m[6]+t.z*i.m[10];r.x=o,r.y=n,r.z=e},c.TransformNormalFromFloatsToRef=function(t,i,r,o,n){n.x=t*o.m[0]+i*o.m[4]+r*o.m[8],n.y=t*o.m[1]+i*o.m[5]+r*o.m[9],n.z=t*o.m[2]+i*o.m[6]+r*o.m[10]},c.CatmullRom=function(t,i,r,o,n){var e=n*n,s=n*e;return new c(.5*(2*i.x+(-t.x+r.x)*n+(2*t.x-5*i.x+4*r.x-o.x)*e+(-t.x+3*i.x-3*r.x+o.x)*s),.5*(2*i.y+(-t.y+r.y)*n+(2*t.y-5*i.y+4*r.y-o.y)*e+(-t.y+3*i.y-3*r.y+o.y)*s),.5*(2*i.z+(-t.z+r.z)*n+(2*t.z-5*i.z+4*r.z-o.z)*e+(-t.z+3*i.z-3*r.z+o.z)*s))},c.Clamp=function(t,i,r){var o=t.x;o=(o=o>r.x?r.x:o)<i.x?i.x:o;var n=t.y;n=(n=n>r.y?r.y:n)<i.y?i.y:n;var e=t.z;return new c(o,n,e=(e=e>r.z?r.z:e)<i.z?i.z:e)},c.Hermite=function(t,i,r,o,n){var e=n*n,s=n*e,h=2*s-3*e+1,a=-2*s+3*e,u=s-2*e+n,m=s-e;return new c(t.x*h+r.x*a+i.x*u+o.x*m,t.y*h+r.y*a+i.y*u+o.y*m,t.z*h+r.z*a+i.z*u+o.z*m)},c.Lerp=function(t,i,r){var o=new c(0,0,0);return c.LerpToRef(t,i,r,o),o},c.LerpToRef=function(t,i,r,o){o.x=t.x+(i.x-t.x)*r,o.y=t.y+(i.y-t.y)*r,o.z=t.z+(i.z-t.z)*r},c.Dot=function(t,i){return t.x*i.x+t.y*i.y+t.z*i.z},c.Cross=function(t,i){var r=c.Zero();return c.CrossToRef(t,i,r),r},c.CrossToRef=function(t,i,r){_.Vector3[0].x=t.y*i.z-t.z*i.y,_.Vector3[0].y=t.z*i.x-t.x*i.z,_.Vector3[0].z=t.x*i.y-t.y*i.x,r.copyFrom(_.Vector3[0])},c.Normalize=function(t){var i=c.Zero();return c.NormalizeToRef(t,i),i},c.NormalizeToRef=function(t,i){i.copyFrom(t),i.normalize()},c.Project=function(t,i,r,o){var n=o.width,e=o.height,s=o.x,h=o.y,a=c._viewportMatrixCache?c._viewportMatrixCache:c._viewportMatrixCache=new m;m.FromValuesToRef(n/2,0,0,0,0,-e/2,0,0,0,0,.5,0,s+n/2,e/2+h,.5,1,a);var u=_.Matrix[0];return i.multiplyToRef(r,u),u.multiplyToRef(a,u),c.TransformCoordinates(t,u)},c.UnprojectFromTransform=function(t,i,r,o,n){var e=_.Matrix[0];o.multiplyToRef(n,e),e.invert(),t.x=t.x/i*2-1,t.y=-(t.y/r*2-1);var s=c.TransformCoordinates(t,e),h=t.x*e.m[3]+t.y*e.m[7]+t.z*e.m[11]+e.m[15];return p.Scalar.WithinEpsilon(h,1)&&(s=s.scale(1/h)),s},c.Unproject=function(t,i,r,o,n,e){var s=c.Zero();return c.UnprojectToRef(t,i,r,o,n,e,s),s},c.UnprojectToRef=function(t,i,r,o,n,e,s){c.UnprojectFloatsToRef(t.x,t.y,t.z,i,r,o,n,e,s)},c.UnprojectFloatsToRef=function(t,i,r,o,n,e,s,h,a){var u=_.Matrix[0];e.multiplyToRef(s,u),u.multiplyToRef(h,u),u.invert();var m=_.Vector3[0];m.x=t/o*2-1,m.y=-(i/n*2-1),m.z=2*r-1,c.TransformCoordinatesToRef(m,u,a);var y=m.x*u.m[3]+m.y*u.m[7]+m.z*u.m[11]+u.m[15];p.Scalar.WithinEpsilon(y,1)&&a.scaleInPlace(1/y)},c.Minimize=function(t,i){var r=t.clone();return r.minimizeInPlace(i),r},c.Maximize=function(t,i){var r=t.clone();return r.maximizeInPlace(i),r},c.Distance=function(t,i){return Math.sqrt(c.DistanceSquared(t,i))},c.DistanceSquared=function(t,i){var r=t.x-i.x,o=t.y-i.y,n=t.z-i.z;return r*r+o*o+n*n},c.Center=function(t,i){var r=t.add(i);return r.scaleInPlace(.5),r},c.RotationFromAxis=function(t,i,r){var o=c.Zero();return c.RotationFromAxisToRef(t,i,r,o),o},c.RotationFromAxisToRef=function(t,i,r,o){var n=_.Quaternion[0];x.RotationQuaternionFromAxisToRef(t,i,r,n),n.toEulerAnglesToRef(o)},c}();p.Vector3=l;var o=function(){function n(t,i,r,o){this.x=t,this.y=i,this.z=r,this.w=o}return n.prototype.toString=function(){return"{X: "+this.x+" Y:"+this.y+" Z:"+this.z+" W:"+this.w+"}"},n.prototype.getClassName=function(){return"Vector4"},n.prototype.getHashCode=function(){var t=this.x||0;return t=397*(t=397*(t=397*t^(this.y||0))^(this.z||0))^(this.w||0)},n.prototype.asArray=function(){var t=new Array;return this.toArray(t,0),t},n.prototype.toArray=function(t,i){return void 0===i&&(i=0),t[i]=this.x,t[i+1]=this.y,t[i+2]=this.z,t[i+3]=this.w,this},n.prototype.addInPlace=function(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this},n.prototype.add=function(t){return new n(this.x+t.x,this.y+t.y,this.z+t.z,this.w+t.w)},n.prototype.addToRef=function(t,i){return i.x=this.x+t.x,i.y=this.y+t.y,i.z=this.z+t.z,i.w=this.w+t.w,this},n.prototype.subtractInPlace=function(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this},n.prototype.subtract=function(t){return new n(this.x-t.x,this.y-t.y,this.z-t.z,this.w-t.w)},n.prototype.subtractToRef=function(t,i){return i.x=this.x-t.x,i.y=this.y-t.y,i.z=this.z-t.z,i.w=this.w-t.w,this},n.prototype.subtractFromFloats=function(t,i,r,o){return new n(this.x-t,this.y-i,this.z-r,this.w-o)},n.prototype.subtractFromFloatsToRef=function(t,i,r,o,n){return n.x=this.x-t,n.y=this.y-i,n.z=this.z-r,n.w=this.w-o,this},n.prototype.negate=function(){return new n(-this.x,-this.y,-this.z,-this.w)},n.prototype.scaleInPlace=function(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this},n.prototype.scale=function(t){return new n(this.x*t,this.y*t,this.z*t,this.w*t)},n.prototype.scaleToRef=function(t,i){return i.x=this.x*t,i.y=this.y*t,i.z=this.z*t,i.w=this.w*t,this},n.prototype.scaleAndAddToRef=function(t,i){return i.x+=this.x*t,i.y+=this.y*t,i.z+=this.z*t,i.w+=this.w*t,this},n.prototype.equals=function(t){return t&&this.x===t.x&&this.y===t.y&&this.z===t.z&&this.w===t.w},n.prototype.equalsWithEpsilon=function(t,i){return void 0===i&&(i=p.Epsilon),t&&p.Scalar.WithinEpsilon(this.x,t.x,i)&&p.Scalar.WithinEpsilon(this.y,t.y,i)&&p.Scalar.WithinEpsilon(this.z,t.z,i)&&p.Scalar.WithinEpsilon(this.w,t.w,i)},n.prototype.equalsToFloats=function(t,i,r,o){return this.x===t&&this.y===i&&this.z===r&&this.w===o},n.prototype.multiplyInPlace=function(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this},n.prototype.multiply=function(t){return new n(this.x*t.x,this.y*t.y,this.z*t.z,this.w*t.w)},n.prototype.multiplyToRef=function(t,i){return i.x=this.x*t.x,i.y=this.y*t.y,i.z=this.z*t.z,i.w=this.w*t.w,this},n.prototype.multiplyByFloats=function(t,i,r,o){return new n(this.x*t,this.y*i,this.z*r,this.w*o)},n.prototype.divide=function(t){return new n(this.x/t.x,this.y/t.y,this.z/t.z,this.w/t.w)},n.prototype.divideToRef=function(t,i){return i.x=this.x/t.x,i.y=this.y/t.y,i.z=this.z/t.z,i.w=this.w/t.w,this},n.prototype.divideInPlace=function(t){return this.divideToRef(t,this)},n.prototype.minimizeInPlace=function(t){return t.x<this.x&&(this.x=t.x),t.y<this.y&&(this.y=t.y),t.z<this.z&&(this.z=t.z),t.w<this.w&&(this.w=t.w),this},n.prototype.maximizeInPlace=function(t){return t.x>this.x&&(this.x=t.x),t.y>this.y&&(this.y=t.y),t.z>this.z&&(this.z=t.z),t.w>this.w&&(this.w=t.w),this},n.prototype.floor=function(){return new n(Math.floor(this.x),Math.floor(this.y),Math.floor(this.z),Math.floor(this.w))},n.prototype.fract=function(){return new n(this.x-Math.floor(this.x),this.y-Math.floor(this.y),this.z-Math.floor(this.z),this.w-Math.floor(this.w))},n.prototype.length=function(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)},n.prototype.lengthSquared=function(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w},n.prototype.normalize=function(){var t=this.length();if(0===t)return this;var i=1/t;return this.x*=i,this.y*=i,this.z*=i,this.w*=i,this},n.prototype.toVector3=function(){return new l(this.x,this.y,this.z)},n.prototype.clone=function(){return new n(this.x,this.y,this.z,this.w)},n.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w,this},n.prototype.copyFromFloats=function(t,i,r,o){return this.x=t,this.y=i,this.z=r,this.w=o,this},n.prototype.set=function(t,i,r,o){return this.copyFromFloats(t,i,r,o)},n.FromArray=function(t,i){return i||(i=0),new n(t[i],t[i+1],t[i+2],t[i+3])},n.FromArrayToRef=function(t,i,r){r.x=t[i],r.y=t[i+1],r.z=t[i+2],r.w=t[i+3]},n.FromFloatArrayToRef=function(t,i,r){n.FromArrayToRef(t,i,r)},n.FromFloatsToRef=function(t,i,r,o,n){n.x=t,n.y=i,n.z=r,n.w=o},n.Zero=function(){return new n(0,0,0,0)},n.One=function(){return new n(1,1,1,1)},n.Normalize=function(t){var i=n.Zero();return n.NormalizeToRef(t,i),i},n.NormalizeToRef=function(t,i){i.copyFrom(t),i.normalize()},n.Minimize=function(t,i){var r=t.clone();return r.minimizeInPlace(i),r},n.Maximize=function(t,i){var r=t.clone();return r.maximizeInPlace(i),r},n.Distance=function(t,i){return Math.sqrt(n.DistanceSquared(t,i))},n.DistanceSquared=function(t,i){var r=t.x-i.x,o=t.y-i.y,n=t.z-i.z,e=t.w-i.w;return r*r+o*o+n*n+e*e},n.Center=function(t,i){var r=t.add(i);return r.scaleInPlace(.5),r},n.TransformNormal=function(t,i){var r=n.Zero();return n.TransformNormalToRef(t,i,r),r},n.TransformNormalToRef=function(t,i,r){var o=t.x*i.m[0]+t.y*i.m[4]+t.z*i.m[8],n=t.x*i.m[1]+t.y*i.m[5]+t.z*i.m[9],e=t.x*i.m[2]+t.y*i.m[6]+t.z*i.m[10];r.x=o,r.y=n,r.z=e,r.w=t.w},n.TransformNormalFromFloatsToRef=function(t,i,r,o,n,e){e.x=t*n.m[0]+i*n.m[4]+r*n.m[8],e.y=t*n.m[1]+i*n.m[5]+r*n.m[9],e.z=t*n.m[2]+i*n.m[6]+r*n.m[10],e.w=o},n}();p.Vector4=o;var t=function(){function o(t,i){this.width=t,this.height=i}return o.prototype.toString=function(){return"{W: "+this.width+", H: "+this.height+"}"},o.prototype.getClassName=function(){return"Size"},o.prototype.getHashCode=function(){var t=this.width||0;return t=397*t^(this.height||0)},o.prototype.copyFrom=function(t){this.width=t.width,this.height=t.height},o.prototype.copyFromFloats=function(t,i){return this.width=t,this.height=i,this},o.prototype.set=function(t,i){return this.copyFromFloats(t,i)},o.prototype.multiplyByFloats=function(t,i){return new o(this.width*t,this.height*i)},o.prototype.clone=function(){return new o(this.width,this.height)},o.prototype.equals=function(t){return!!t&&(this.width===t.width&&this.height===t.height)},Object.defineProperty(o.prototype,"surface",{get:function(){return this.width*this.height},enumerable:!0,configurable:!0}),o.Zero=function(){return new o(0,0)},o.prototype.add=function(t){return new o(this.width+t.width,this.height+t.height)},o.prototype.subtract=function(t){return new o(this.width-t.width,this.height-t.height)},o.Lerp=function(t,i,r){return new o(t.width+(i.width-t.width)*r,t.height+(i.height-t.height)*r)},o}();p.Size=t;var x=function(){function y(t,i,r,o){void 0===t&&(t=0),void 0===i&&(i=0),void 0===r&&(r=0),void 0===o&&(o=1),this.x=t,this.y=i,this.z=r,this.w=o}return y.prototype.toString=function(){return"{X: "+this.x+" Y:"+this.y+" Z:"+this.z+" W:"+this.w+"}"},y.prototype.getClassName=function(){return"Quaternion"},y.prototype.getHashCode=function(){var t=this.x||0;return t=397*(t=397*(t=397*t^(this.y||0))^(this.z||0))^(this.w||0)},y.prototype.asArray=function(){return[this.x,this.y,this.z,this.w]},y.prototype.equals=function(t){return t&&this.x===t.x&&this.y===t.y&&this.z===t.z&&this.w===t.w},y.prototype.clone=function(){return new y(this.x,this.y,this.z,this.w)},y.prototype.copyFrom=function(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w,this},y.prototype.copyFromFloats=function(t,i,r,o){return this.x=t,this.y=i,this.z=r,this.w=o,this},y.prototype.set=function(t,i,r,o){return this.copyFromFloats(t,i,r,o)},y.prototype.add=function(t){return new y(this.x+t.x,this.y+t.y,this.z+t.z,this.w+t.w)},y.prototype.addInPlace=function(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this},y.prototype.subtract=function(t){return new y(this.x-t.x,this.y-t.y,this.z-t.z,this.w-t.w)},y.prototype.scale=function(t){return new y(this.x*t,this.y*t,this.z*t,this.w*t)},y.prototype.scaleToRef=function(t,i){return i.x=this.x*t,i.y=this.y*t,i.z=this.z*t,i.w=this.w*t,this},y.prototype.scaleInPlace=function(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this},y.prototype.scaleAndAddToRef=function(t,i){return i.x+=this.x*t,i.y+=this.y*t,i.z+=this.z*t,i.w+=this.w*t,this},y.prototype.multiply=function(t){var i=new y(0,0,0,1);return this.multiplyToRef(t,i),i},y.prototype.multiplyToRef=function(t,i){var r=this.x*t.w+this.y*t.z-this.z*t.y+this.w*t.x,o=-this.x*t.z+this.y*t.w+this.z*t.x+this.w*t.y,n=this.x*t.y-this.y*t.x+this.z*t.w+this.w*t.z,e=-this.x*t.x-this.y*t.y-this.z*t.z+this.w*t.w;return i.copyFromFloats(r,o,n,e),this},y.prototype.multiplyInPlace=function(t){return this.multiplyToRef(t,this),this},y.prototype.conjugateToRef=function(t){return t.copyFromFloats(-this.x,-this.y,-this.z,this.w),this},y.prototype.conjugateInPlace=function(){return this.x*=-1,this.y*=-1,this.z*=-1,this},y.prototype.conjugate=function(){return new y(-this.x,-this.y,-this.z,this.w)},y.prototype.length=function(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)},y.prototype.normalize=function(){var t=1/this.length();return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this},y.prototype.toEulerAngles=function(t){void 0===t&&(t="YZX");var i=l.Zero();return this.toEulerAnglesToRef(i,t),i},y.prototype.toEulerAnglesToRef=function(t,i){void 0===i&&(i="YZX");var r=this.z,o=this.x,n=this.y,e=this.w,s=e*e,h=r*r,a=o*o,u=n*n,m=n*r-o*e;return m<-.4999999?(t.y=2*Math.atan2(n,e),t.x=Math.PI/2,t.z=0):.4999999<m?(t.y=2*Math.atan2(n,e),t.x=-Math.PI/2,t.z=0):(t.z=Math.atan2(2*(o*n+r*e),-h-a+u+s),t.x=Math.asin(-2*(r*n-o*e)),t.y=Math.atan2(2*(r*o+n*e),h-a-u+s)),this},y.prototype.toRotationMatrix=function(t){var i=this.x*this.x,r=this.y*this.y,o=this.z*this.z,n=this.x*this.y,e=this.z*this.w,s=this.z*this.x,h=this.y*this.w,a=this.y*this.z,u=this.x*this.w;return t.m[0]=1-2*(r+o),t.m[1]=2*(n+e),t.m[2]=2*(s-h),t.m[3]=0,t.m[4]=2*(n-e),t.m[5]=1-2*(o+i),t.m[6]=2*(a+u),t.m[7]=0,t.m[8]=2*(s+h),t.m[9]=2*(a-u),t.m[10]=1-2*(r+i),t.m[11]=0,t.m[12]=0,t.m[13]=0,t.m[14]=0,t.m[15]=1,t._markAsUpdated(),this},y.prototype.fromRotationMatrix=function(t){return y.FromRotationMatrixToRef(t,this),this},y.FromRotationMatrix=function(t){var i=new y;return y.FromRotationMatrixToRef(t,i),i},y.FromRotationMatrixToRef=function(t,i){var r,o=t.m,n=o[0],e=o[4],s=o[8],h=o[1],a=o[5],u=o[9],m=o[2],y=o[6],c=o[10],p=n+a+c;0<p?(r=.5/Math.sqrt(p+1),i.w=.25/r,i.x=(y-u)*r,i.y=(s-m)*r,i.z=(h-e)*r):a<n&&c<n?(r=2*Math.sqrt(1+n-a-c),i.w=(y-u)/r,i.x=.25*r,i.y=(e+h)/r,i.z=(s+m)/r):c<a?(r=2*Math.sqrt(1+a-n-c),i.w=(s-m)/r,i.x=(e+h)/r,i.y=.25*r,i.z=(u+y)/r):(r=2*Math.sqrt(1+c-n-a),i.w=(h-e)/r,i.x=(s+m)/r,i.y=(u+y)/r,i.z=.25*r)},y.Dot=function(t,i){return t.x*i.x+t.y*i.y+t.z*i.z+t.w*i.w},y.AreClose=function(t,i){return 0<=y.Dot(t,i)},y.Zero=function(){return new y(0,0,0,0)},y.Inverse=function(t){return new y(-t.x,-t.y,-t.z,t.w)},y.Identity=function(){return new y(0,0,0,1)},y.IsIdentity=function(t){return t&&0===t.x&&0===t.y&&0===t.z&&1===t.w},y.RotationAxis=function(t,i){return y.RotationAxisToRef(t,i,new y)},y.RotationAxisToRef=function(t,i,r){var o=Math.sin(i/2);return t.normalize(),r.w=Math.cos(i/2),r.x=t.x*o,r.y=t.y*o,r.z=t.z*o,r},y.FromArray=function(t,i){return i||(i=0),new y(t[i],t[i+1],t[i+2],t[i+3])},y.RotationYawPitchRoll=function(t,i,r){var o=new y;return y.RotationYawPitchRollToRef(t,i,r,o),o},y.RotationYawPitchRollToRef=function(t,i,r,o){var n=.5*r,e=.5*i,s=.5*t,h=Math.sin(n),a=Math.cos(n),u=Math.sin(e),m=Math.cos(e),y=Math.sin(s),c=Math.cos(s);o.x=c*u*a+y*m*h,o.y=y*m*a-c*u*h,o.z=c*m*h-y*u*a,o.w=c*m*a+y*u*h},y.RotationAlphaBetaGamma=function(t,i,r){var o=new y;return y.RotationAlphaBetaGammaToRef(t,i,r,o),o},y.RotationAlphaBetaGammaToRef=function(t,i,r,o){var n=.5*(r+t),e=.5*(r-t),s=.5*i;o.x=Math.cos(e)*Math.sin(s),o.y=Math.sin(e)*Math.sin(s),o.z=Math.sin(n)*Math.cos(s),o.w=Math.cos(n)*Math.cos(s)},y.RotationQuaternionFromAxis=function(t,i,r){var o=new y(0,0,0,0);return y.RotationQuaternionFromAxisToRef(t,i,r,o),o},y.RotationQuaternionFromAxisToRef=function(t,i,r,o){var n=_.Matrix[0];m.FromXYZAxesToRef(t.normalize(),i.normalize(),r.normalize(),n),y.FromRotationMatrixToRef(n,o)},y.Slerp=function(t,i,r){var o=y.Identity();return y.SlerpToRef(t,i,r,o),o},y.SlerpToRef=function(t,i,r,o){var n,e,s=t.x*i.x+t.y*i.y+t.z*i.z+t.w*i.w,h=!1;if(s<0&&(h=!0,s=-s),.999999<s)e=1-r,n=h?-r:r;else{var a=Math.acos(s),u=1/Math.sin(a);e=Math.sin((1-r)*a)*u,n=h?-Math.sin(r*a)*u:Math.sin(r*a)*u}o.x=e*t.x+n*i.x,o.y=e*t.y+n*i.y,o.z=e*t.z+n*i.z,o.w=e*t.w+n*i.w},y.Hermite=function(t,i,r,o,n){var e=n*n,s=n*e,h=2*s-3*e+1,a=-2*s+3*e,u=s-2*e+n,m=s-e;return new y(t.x*h+r.x*a+i.x*u+o.x*m,t.y*h+r.y*a+i.y*u+o.y*m,t.z*h+r.z*a+i.z*u+o.z*m,t.w*h+r.w*a+i.w*u+o.w*m)},y}();p.Quaternion=x;var m=function(){function z(){this._isIdentity=!1,this._isIdentityDirty=!0,this.m=new Float32Array(16),this._markAsUpdated()}return z.prototype._markAsUpdated=function(){this.updateFlag=z._updateFlagSeed++,this._isIdentityDirty=!0},z.prototype.isIdentity=function(t){return void 0===t&&(t=!1),this._isIdentityDirty&&(this._isIdentityDirty=!1,1!==this.m[0]||1!==this.m[5]||1!==this.m[15]?this._isIdentity=!1:0!==this.m[1]||0!==this.m[2]||0!==this.m[3]||0!==this.m[4]||0!==this.m[6]||0!==this.m[7]||0!==this.m[8]||0!==this.m[9]||0!==this.m[11]||0!==this.m[12]||0!==this.m[13]||0!==this.m[14]?this._isIdentity=!1:this._isIdentity=!0,t||1===this.m[10]||(this._isIdentity=!1)),this._isIdentity},z.prototype.determinant=function(){var t=this.m[10]*this.m[15]-this.m[11]*this.m[14],i=this.m[9]*this.m[15]-this.m[11]*this.m[13],r=this.m[9]*this.m[14]-this.m[10]*this.m[13],o=this.m[8]*this.m[15]-this.m[11]*this.m[12],n=this.m[8]*this.m[14]-this.m[10]*this.m[12],e=this.m[8]*this.m[13]-this.m[9]*this.m[12];return this.m[0]*(this.m[5]*t-this.m[6]*i+this.m[7]*r)-this.m[1]*(this.m[4]*t-this.m[6]*o+this.m[7]*n)+this.m[2]*(this.m[4]*i-this.m[5]*o+this.m[7]*e)-this.m[3]*(this.m[4]*r-this.m[5]*n+this.m[6]*e)},z.prototype.toArray=function(){return this.m},z.prototype.asArray=function(){return this.toArray()},z.prototype.invert=function(){return this.invertToRef(this),this},z.prototype.reset=function(){for(var t=0;t<16;t++)this.m[t]=0;return this._markAsUpdated(),this},z.prototype.add=function(t){var i=new z;return this.addToRef(t,i),i},z.prototype.addToRef=function(t,i){for(var r=0;r<16;r++)i.m[r]=this.m[r]+t.m[r];return i._markAsUpdated(),this},z.prototype.addToSelf=function(t){for(var i=0;i<16;i++)this.m[i]+=t.m[i];return this._markAsUpdated(),this},z.prototype.invertToRef=function(t){var i=this.m[0],r=this.m[1],o=this.m[2],n=this.m[3],e=this.m[4],s=this.m[5],h=this.m[6],a=this.m[7],u=this.m[8],m=this.m[9],y=this.m[10],c=this.m[11],p=this.m[12],f=this.m[13],l=this.m[14],x=this.m[15],z=y*x-c*l,w=m*x-c*f,d=m*l-y*f,v=u*x-c*p,R=u*l-y*p,T=u*f-m*p,g=s*z-h*w+a*d,A=-(e*z-h*v+a*R),_=e*w-s*v+a*T,F=-(e*d-s*R+h*T),M=1/(i*g+r*A+o*_+n*F),b=h*x-a*l,P=s*x-a*f,C=s*l-h*f,S=e*x-a*p,Z=e*l-h*p,I=e*f-s*p,L=h*c-a*y,V=s*c-a*m,D=s*y-h*m,H=e*c-a*u,N=e*y-h*u,q=e*m-s*u;return t.m[0]=g*M,t.m[4]=A*M,t.m[8]=_*M,t.m[12]=F*M,t.m[1]=-(r*z-o*w+n*d)*M,t.m[5]=(i*z-o*v+n*R)*M,t.m[9]=-(i*w-r*v+n*T)*M,t.m[13]=(i*d-r*R+o*T)*M,t.m[2]=(r*b-o*P+n*C)*M,t.m[6]=-(i*b-o*S+n*Z)*M,t.m[10]=(i*P-r*S+n*I)*M,t.m[14]=-(i*C-r*Z+o*I)*M,t.m[3]=-(r*L-o*V+n*D)*M,t.m[7]=(i*L-o*H+n*N)*M,t.m[11]=-(i*V-r*H+n*q)*M,t.m[15]=(i*D-r*N+o*q)*M,t._markAsUpdated(),this},z.prototype.setTranslationFromFloats=function(t,i,r){return this.m[12]=t,this.m[13]=i,this.m[14]=r,this._markAsUpdated(),this},z.prototype.setTranslation=function(t){return this.m[12]=t.x,this.m[13]=t.y,this.m[14]=t.z,this._markAsUpdated(),this},z.prototype.getTranslation=function(){return new l(this.m[12],this.m[13],this.m[14])},z.prototype.getTranslationToRef=function(t){return t.x=this.m[12],t.y=this.m[13],t.z=this.m[14],this},z.prototype.removeRotationAndScaling=function(){return this.setRowFromFloats(0,1,0,0,0),this.setRowFromFloats(1,0,1,0,0),this.setRowFromFloats(2,0,0,1,0),this},z.prototype.multiply=function(t){var i=new z;return this.multiplyToRef(t,i),i},z.prototype.copyFrom=function(t){for(var i=0;i<16;i++)this.m[i]=t.m[i];return this._markAsUpdated(),this},z.prototype.copyToArray=function(t,i){void 0===i&&(i=0);for(var r=0;r<16;r++)t[i+r]=this.m[r];return this},z.prototype.multiplyToRef=function(t,i){return this.multiplyToArray(t,i.m,0),i._markAsUpdated(),this},z.prototype.multiplyToArray=function(t,i,r){var o=this.m[0],n=this.m[1],e=this.m[2],s=this.m[3],h=this.m[4],a=this.m[5],u=this.m[6],m=this.m[7],y=this.m[8],c=this.m[9],p=this.m[10],f=this.m[11],l=this.m[12],x=this.m[13],z=this.m[14],w=this.m[15],d=t.m[0],v=t.m[1],R=t.m[2],T=t.m[3],g=t.m[4],A=t.m[5],_=t.m[6],F=t.m[7],M=t.m[8],b=t.m[9],P=t.m[10],C=t.m[11],S=t.m[12],Z=t.m[13],I=t.m[14],L=t.m[15];return i[r]=o*d+n*g+e*M+s*S,i[r+1]=o*v+n*A+e*b+s*Z,i[r+2]=o*R+n*_+e*P+s*I,i[r+3]=o*T+n*F+e*C+s*L,i[r+4]=h*d+a*g+u*M+m*S,i[r+5]=h*v+a*A+u*b+m*Z,i[r+6]=h*R+a*_+u*P+m*I,i[r+7]=h*T+a*F+u*C+m*L,i[r+8]=y*d+c*g+p*M+f*S,i[r+9]=y*v+c*A+p*b+f*Z,i[r+10]=y*R+c*_+p*P+f*I,i[r+11]=y*T+c*F+p*C+f*L,i[r+12]=l*d+x*g+z*M+w*S,i[r+13]=l*v+x*A+z*b+w*Z,i[r+14]=l*R+x*_+z*P+w*I,i[r+15]=l*T+x*F+z*C+w*L,this},z.prototype.equals=function(t){return t&&this.m[0]===t.m[0]&&this.m[1]===t.m[1]&&this.m[2]===t.m[2]&&this.m[3]===t.m[3]&&this.m[4]===t.m[4]&&this.m[5]===t.m[5]&&this.m[6]===t.m[6]&&this.m[7]===t.m[7]&&this.m[8]===t.m[8]&&this.m[9]===t.m[9]&&this.m[10]===t.m[10]&&this.m[11]===t.m[11]&&this.m[12]===t.m[12]&&this.m[13]===t.m[13]&&this.m[14]===t.m[14]&&this.m[15]===t.m[15]},z.prototype.clone=function(){return z.FromValues(this.m[0],this.m[1],this.m[2],this.m[3],this.m[4],this.m[5],this.m[6],this.m[7],this.m[8],this.m[9],this.m[10],this.m[11],this.m[12],this.m[13],this.m[14],this.m[15])},z.prototype.getClassName=function(){return"Matrix"},z.prototype.getHashCode=function(){for(var t=this.m[0]||0,i=1;i<16;i++)t=397*t^(this.m[i]||0);return t},z.prototype.decompose=function(t,i,r){return r&&(r.x=this.m[12],r.y=this.m[13],r.z=this.m[14]),(t=t||_.Vector3[0]).x=Math.sqrt(this.m[0]*this.m[0]+this.m[1]*this.m[1]+this.m[2]*this.m[2]),t.y=Math.sqrt(this.m[4]*this.m[4]+this.m[5]*this.m[5]+this.m[6]*this.m[6]),t.z=Math.sqrt(this.m[8]*this.m[8]+this.m[9]*this.m[9]+this.m[10]*this.m[10]),this.determinant()<=0&&(t.y*=-1),0===t.x||0===t.y||0===t.z?(i&&(i.x=0,i.y=0,i.z=0,i.w=1),!1):(i&&(z.FromValuesToRef(this.m[0]/t.x,this.m[1]/t.x,this.m[2]/t.x,0,this.m[4]/t.y,this.m[5]/t.y,this.m[6]/t.y,0,this.m[8]/t.z,this.m[9]/t.z,this.m[10]/t.z,0,0,0,0,1,_.Matrix[0]),x.FromRotationMatrixToRef(_.Matrix[0],i)),!0)},z.prototype.getRow=function(t){if(t<0||3<t)return null;var i=4*t;return new o(this.m[i+0],this.m[i+1],this.m[i+2],this.m[i+3])},z.prototype.setRow=function(t,i){if(t<0||3<t)return this;var r=4*t;return this.m[r+0]=i.x,this.m[r+1]=i.y,this.m[r+2]=i.z,this.m[r+3]=i.w,this._markAsUpdated(),this},z.prototype.transpose=function(){return z.Transpose(this)},z.prototype.transposeToRef=function(t){return z.TransposeToRef(this,t),this},z.prototype.setRowFromFloats=function(t,i,r,o,n){if(t<0||3<t)return this;var e=4*t;return this.m[e+0]=i,this.m[e+1]=r,this.m[e+2]=o,this.m[e+3]=n,this._markAsUpdated(),this},z.prototype.scale=function(t){var i=new z;return this.scaleToRef(t,i),i},z.prototype.scaleToRef=function(t,i){for(var r=0;r<16;r++)i.m[r]=this.m[r]*t;return i._markAsUpdated(),this},z.prototype.scaleAndAddToRef=function(t,i){for(var r=0;r<16;r++)i.m[r]+=this.m[r]*t;return i._markAsUpdated(),this},z.prototype.toNormalMatrix=function(t){this.invertToRef(t),t.transpose();var i=t.m;z.FromValuesToRef(i[0],i[1],i[2],0,i[4],i[5],i[6],0,i[8],i[9],i[10],0,0,0,0,1,t)},z.prototype.getRotationMatrix=function(){var t=z.Identity();return this.getRotationMatrixToRef(t),t},z.prototype.getRotationMatrixToRef=function(t){var i=this.m,r=Math.sqrt(i[0]*i[0]+i[1]*i[1]+i[2]*i[2]),o=Math.sqrt(i[4]*i[4]+i[5]*i[5]+i[6]*i[6]),n=Math.sqrt(i[8]*i[8]+i[9]*i[9]+i[10]*i[10]);return this.determinant()<=0&&(o*=-1),0===r||0===o||0===n?z.IdentityToRef(t):z.FromValuesToRef(i[0]/r,i[1]/r,i[2]/r,0,i[4]/o,i[5]/o,i[6]/o,0,i[8]/n,i[9]/n,i[10]/n,0,0,0,0,1,t),this},z.FromArray=function(t,i){var r=new z;return i||(i=0),z.FromArrayToRef(t,i,r),r},z.FromArrayToRef=function(t,i,r){for(var o=0;o<16;o++)r.m[o]=t[o+i];r._markAsUpdated()},z.FromFloat32ArrayToRefScaled=function(t,i,r,o){for(var n=0;n<16;n++)o.m[n]=t[n+i]*r;o._markAsUpdated()},z.FromValuesToRef=function(t,i,r,o,n,e,s,h,a,u,m,y,c,p,f,l,x){x.m[0]=t,x.m[1]=i,x.m[2]=r,x.m[3]=o,x.m[4]=n,x.m[5]=e,x.m[6]=s,x.m[7]=h,x.m[8]=a,x.m[9]=u,x.m[10]=m,x.m[11]=y,x.m[12]=c,x.m[13]=p,x.m[14]=f,x.m[15]=l,x._markAsUpdated()},Object.defineProperty(z,"IdentityReadOnly",{get:function(){return z._identityReadOnly},enumerable:!0,configurable:!0}),z.FromValues=function(t,i,r,o,n,e,s,h,a,u,m,y,c,p,f,l){var x=new z;return x.m[0]=t,x.m[1]=i,x.m[2]=r,x.m[3]=o,x.m[4]=n,x.m[5]=e,x.m[6]=s,x.m[7]=h,x.m[8]=a,x.m[9]=u,x.m[10]=m,x.m[11]=y,x.m[12]=c,x.m[13]=p,x.m[14]=f,x.m[15]=l,x},z.Compose=function(t,i,r){var o=z.Identity();return z.ComposeToRef(t,i,r,o),o},z.ComposeToRef=function(t,i,r,o){z.FromValuesToRef(t.x,0,0,0,0,t.y,0,0,0,0,t.z,0,0,0,0,1,_.Matrix[1]),i.toRotationMatrix(_.Matrix[0]),_.Matrix[1].multiplyToRef(_.Matrix[0],o),o.setTranslation(r)},z.Identity=function(){return z.FromValues(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)},z.IdentityToRef=function(t){z.FromValuesToRef(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,t)},z.Zero=function(){return z.FromValues(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)},z.RotationX=function(t){var i=new z;return z.RotationXToRef(t,i),i},z.Invert=function(t){var i=new z;return t.invertToRef(i),i},z.RotationXToRef=function(t,i){var r=Math.sin(t),o=Math.cos(t);i.m[0]=1,i.m[15]=1,i.m[5]=o,i.m[10]=o,i.m[9]=-r,i.m[6]=r,i.m[1]=0,i.m[2]=0,i.m[3]=0,i.m[4]=0,i.m[7]=0,i.m[8]=0,i.m[11]=0,i.m[12]=0,i.m[13]=0,i.m[14]=0,i._markAsUpdated()},z.RotationY=function(t){var i=new z;return z.RotationYToRef(t,i),i},z.RotationYToRef=function(t,i){var r=Math.sin(t),o=Math.cos(t);i.m[5]=1,i.m[15]=1,i.m[0]=o,i.m[2]=-r,i.m[8]=r,i.m[10]=o,i.m[1]=0,i.m[3]=0,i.m[4]=0,i.m[6]=0,i.m[7]=0,i.m[9]=0,i.m[11]=0,i.m[12]=0,i.m[13]=0,i.m[14]=0,i._markAsUpdated()},z.RotationZ=function(t){var i=new z;return z.RotationZToRef(t,i),i},z.RotationZToRef=function(t,i){var r=Math.sin(t),o=Math.cos(t);i.m[10]=1,i.m[15]=1,i.m[0]=o,i.m[1]=r,i.m[4]=-r,i.m[5]=o,i.m[2]=0,i.m[3]=0,i.m[6]=0,i.m[7]=0,i.m[8]=0,i.m[9]=0,i.m[11]=0,i.m[12]=0,i.m[13]=0,i.m[14]=0,i._markAsUpdated()},z.RotationAxis=function(t,i){var r=z.Zero();return z.RotationAxisToRef(t,i,r),r},z.RotationAxisToRef=function(t,i,r){var o=Math.sin(-i),n=Math.cos(-i),e=1-n;t.normalize(),r.m[0]=t.x*t.x*e+n,r.m[1]=t.x*t.y*e-t.z*o,r.m[2]=t.x*t.z*e+t.y*o,r.m[3]=0,r.m[4]=t.y*t.x*e+t.z*o,r.m[5]=t.y*t.y*e+n,r.m[6]=t.y*t.z*e-t.x*o,r.m[7]=0,r.m[8]=t.z*t.x*e-t.y*o,r.m[9]=t.z*t.y*e+t.x*o,r.m[10]=t.z*t.z*e+n,r.m[11]=0,r.m[15]=1,r._markAsUpdated()},z.RotationYawPitchRoll=function(t,i,r){var o=new z;return z.RotationYawPitchRollToRef(t,i,r,o),o},z.RotationYawPitchRollToRef=function(t,i,r,o){x.RotationYawPitchRollToRef(t,i,r,this._tempQuaternion),this._tempQuaternion.toRotationMatrix(o)},z.Scaling=function(t,i,r){var o=z.Zero();return z.ScalingToRef(t,i,r,o),o},z.ScalingToRef=function(t,i,r,o){o.m[0]=t,o.m[1]=0,o.m[2]=0,o.m[3]=0,o.m[4]=0,o.m[5]=i,o.m[6]=0,o.m[7]=0,o.m[8]=0,o.m[9]=0,o.m[10]=r,o.m[11]=0,o.m[12]=0,o.m[13]=0,o.m[14]=0,o.m[15]=1,o._markAsUpdated()},z.Translation=function(t,i,r){var o=z.Identity();return z.TranslationToRef(t,i,r,o),o},z.TranslationToRef=function(t,i,r,o){z.FromValuesToRef(1,0,0,0,0,1,0,0,0,0,1,0,t,i,r,1,o)},z.Lerp=function(t,i,r){var o=z.Zero();return z.LerpToRef(t,i,r,o),o},z.LerpToRef=function(t,i,r,o){for(var n=0;n<16;n++)o.m[n]=t.m[n]*(1-r)+i.m[n]*r;o._markAsUpdated()},z.DecomposeLerp=function(t,i,r){var o=z.Zero();return z.DecomposeLerpToRef(t,i,r,o),o},z.DecomposeLerpToRef=function(t,i,r,o){var n=_.Vector3[0],e=_.Quaternion[0],s=_.Vector3[1];t.decompose(n,e,s);var h=_.Vector3[2],a=_.Quaternion[1],u=_.Vector3[3];i.decompose(h,a,u);var m=_.Vector3[4];l.LerpToRef(n,h,r,m);var y=_.Quaternion[2];x.SlerpToRef(e,a,r,y);var c=_.Vector3[5];l.LerpToRef(s,u,r,c),z.ComposeToRef(m,y,c,o)},z.LookAtLH=function(t,i,r){var o=z.Zero();return z.LookAtLHToRef(t,i,r,o),o},z.LookAtLHToRef=function(t,i,r,o){i.subtractToRef(t,this._zAxis),this._zAxis.normalize(),l.CrossToRef(r,this._zAxis,this._xAxis),0===this._xAxis.lengthSquared()?this._xAxis.x=1:this._xAxis.normalize(),l.CrossToRef(this._zAxis,this._xAxis,this._yAxis),this._yAxis.normalize();var n=-l.Dot(this._xAxis,t),e=-l.Dot(this._yAxis,t),s=-l.Dot(this._zAxis,t);return z.FromValuesToRef(this._xAxis.x,this._yAxis.x,this._zAxis.x,0,this._xAxis.y,this._yAxis.y,this._zAxis.y,0,this._xAxis.z,this._yAxis.z,this._zAxis.z,0,n,e,s,1,o)},z.LookAtRH=function(t,i,r){var o=z.Zero();return z.LookAtRHToRef(t,i,r,o),o},z.LookAtRHToRef=function(t,i,r,o){t.subtractToRef(i,this._zAxis),this._zAxis.normalize(),l.CrossToRef(r,this._zAxis,this._xAxis),0===this._xAxis.lengthSquared()?this._xAxis.x=1:this._xAxis.normalize(),l.CrossToRef(this._zAxis,this._xAxis,this._yAxis),this._yAxis.normalize();var n=-l.Dot(this._xAxis,t),e=-l.Dot(this._yAxis,t),s=-l.Dot(this._zAxis,t);return z.FromValuesToRef(this._xAxis.x,this._yAxis.x,this._zAxis.x,0,this._xAxis.y,this._yAxis.y,this._zAxis.y,0,this._xAxis.z,this._yAxis.z,this._zAxis.z,0,n,e,s,1,o)},z.OrthoLH=function(t,i,r,o){var n=z.Zero();return z.OrthoLHToRef(t,i,r,o,n),n},z.OrthoLHToRef=function(t,i,r,o,n){z.FromValuesToRef(2/t,0,0,0,0,2/i,0,0,0,0,2/(o-r),0,0,0,-(o+r)/(o-r),1,n)},z.OrthoOffCenterLH=function(t,i,r,o,n,e){var s=z.Zero();return z.OrthoOffCenterLHToRef(t,i,r,o,n,e,s),s},z.OrthoOffCenterLHToRef=function(t,i,r,o,n,e,s){z.FromValuesToRef(2/(i-t),0,0,0,0,2/(o-r),0,0,0,0,2/(e-n),0,(t+i)/(t-i),(o+r)/(r-o),-(e+n)/(e-n),1,s)},z.OrthoOffCenterRH=function(t,i,r,o,n,e){var s=z.Zero();return z.OrthoOffCenterRHToRef(t,i,r,o,n,e,s),s},z.OrthoOffCenterRHToRef=function(t,i,r,o,n,e,s){z.OrthoOffCenterLHToRef(t,i,r,o,n,e,s),s.m[10]*=-1},z.PerspectiveLH=function(t,i,r,o){var n=z.Zero();return z.FromValuesToRef(2*r/t,0,0,0,0,2*r/i,0,0,0,0,(o+r)/(o-r),1,0,0,-2*o*r/(o-r),0,n),n},z.PerspectiveFovLH=function(t,i,r,o){var n=z.Zero();return z.PerspectiveFovLHToRef(t,i,r,o,n),n},z.PerspectiveFovLHToRef=function(t,i,r,o,n,e){void 0===e&&(e=!0);var s=r,h=o,a=1/Math.tan(.5*t);z.FromValuesToRef(e?a/i:a,0,0,0,0,e?a:a*i,0,0,0,0,(h+s)/(h-s),1,0,0,-2*h*s/(h-s),0,n)},z.PerspectiveFovRH=function(t,i,r,o){var n=z.Zero();return z.PerspectiveFovRHToRef(t,i,r,o,n),n},z.PerspectiveFovRHToRef=function(t,i,r,o,n,e){void 0===e&&(e=!0);var s=r,h=o,a=1/Math.tan(.5*t);z.FromValuesToRef(e?a/i:a,0,0,0,0,e?a:a*i,0,0,0,0,-(h+s)/(h-s),-1,0,0,-2*h*s/(h-s),0,n)},z.PerspectiveFovWebVRToRef=function(t,i,r,o,n){void 0===n&&(n=!1);var e=n?-1:1,s=Math.tan(t.upDegrees*Math.PI/180),h=Math.tan(t.downDegrees*Math.PI/180),a=Math.tan(t.leftDegrees*Math.PI/180),u=Math.tan(t.rightDegrees*Math.PI/180),m=2/(a+u),y=2/(s+h);o.m[0]=m,o.m[1]=o.m[2]=o.m[3]=o.m[4]=0,o.m[5]=y,o.m[6]=o.m[7]=0,o.m[8]=(a-u)*m*.5,o.m[9]=-(s-h)*y*.5,o.m[10]=-r/(i-r),o.m[11]=1*e,o.m[12]=o.m[13]=o.m[15]=0,o.m[14]=-2*r*i/(r-i),o._markAsUpdated()},z.GetFinalMatrix=function(t,i,r,o,n,e){var s=t.width,h=t.height,a=t.x,u=t.y,m=z.FromValues(s/2,0,0,0,0,-h/2,0,0,0,0,e-n,0,a+s/2,h/2+u,n,1);return i.multiply(r).multiply(o).multiply(m)},z.GetAsMatrix2x2=function(t){return new Float32Array([t.m[0],t.m[1],t.m[4],t.m[5]])},z.GetAsMatrix3x3=function(t){return new Float32Array([t.m[0],t.m[1],t.m[2],t.m[4],t.m[5],t.m[6],t.m[8],t.m[9],t.m[10]])},z.Transpose=function(t){var i=new z;return z.TransposeToRef(t,i),i},z.TransposeToRef=function(t,i){i.m[0]=t.m[0],i.m[1]=t.m[4],i.m[2]=t.m[8],i.m[3]=t.m[12],i.m[4]=t.m[1],i.m[5]=t.m[5],i.m[6]=t.m[9],i.m[7]=t.m[13],i.m[8]=t.m[2],i.m[9]=t.m[6],i.m[10]=t.m[10],i.m[11]=t.m[14],i.m[12]=t.m[3],i.m[13]=t.m[7],i.m[14]=t.m[11],i.m[15]=t.m[15]},z.Reflection=function(t){var i=new z;return z.ReflectionToRef(t,i),i},z.ReflectionToRef=function(t,i){t.normalize();var r=t.normal.x,o=t.normal.y,n=t.normal.z,e=-2*r,s=-2*o,h=-2*n;i.m[0]=e*r+1,i.m[1]=s*r,i.m[2]=h*r,i.m[3]=0,i.m[4]=e*o,i.m[5]=s*o+1,i.m[6]=h*o,i.m[7]=0,i.m[8]=e*n,i.m[9]=s*n,i.m[10]=h*n+1,i.m[11]=0,i.m[12]=e*t.d,i.m[13]=s*t.d,i.m[14]=h*t.d,i.m[15]=1,i._markAsUpdated()},z.FromXYZAxesToRef=function(t,i,r,o){o.m[0]=t.x,o.m[1]=t.y,o.m[2]=t.z,o.m[3]=0,o.m[4]=i.x,o.m[5]=i.y,o.m[6]=i.z,o.m[7]=0,o.m[8]=r.x,o.m[9]=r.y,o.m[10]=r.z,o.m[11]=0,o.m[12]=0,o.m[13]=0,o.m[14]=0,o.m[15]=1,o._markAsUpdated()},z.FromQuaternionToRef=function(t,i){var r=t.x*t.x,o=t.y*t.y,n=t.z*t.z,e=t.x*t.y,s=t.z*t.w,h=t.z*t.x,a=t.y*t.w,u=t.y*t.z,m=t.x*t.w;i.m[0]=1-2*(o+n),i.m[1]=2*(e+s),i.m[2]=2*(h-a),i.m[3]=0,i.m[4]=2*(e-s),i.m[5]=1-2*(n+r),i.m[6]=2*(u+m),i.m[7]=0,i.m[8]=2*(h+a),i.m[9]=2*(u-m),i.m[10]=1-2*(o+r),i.m[11]=0,i.m[12]=0,i.m[13]=0,i.m[14]=0,i.m[15]=1,i._markAsUpdated()},z._tempQuaternion=new x,z._xAxis=l.Zero(),z._yAxis=l.Zero(),z._zAxis=l.Zero(),z._updateFlagSeed=0,z._identityReadOnly=z.Identity(),z}();p.Matrix=m;var n=function(){function s(t,i,r,o){this.normal=new l(t,i,r),this.d=o}return s.prototype.asArray=function(){return[this.normal.x,this.normal.y,this.normal.z,this.d]},s.prototype.clone=function(){return new s(this.normal.x,this.normal.y,this.normal.z,this.d)},s.prototype.getClassName=function(){return"Plane"},s.prototype.getHashCode=function(){var t=this.normal.getHashCode();return t=397*t^(this.d||0)},s.prototype.normalize=function(){var t=Math.sqrt(this.normal.x*this.normal.x+this.normal.y*this.normal.y+this.normal.z*this.normal.z),i=0;return 0!==t&&(i=1/t),this.normal.x*=i,this.normal.y*=i,this.normal.z*=i,this.d*=i,this},s.prototype.transform=function(t){var i=m.Transpose(t),r=this.normal.x,o=this.normal.y,n=this.normal.z,e=this.d;return new s(r*i.m[0]+o*i.m[1]+n*i.m[2]+e*i.m[3],r*i.m[4]+o*i.m[5]+n*i.m[6]+e*i.m[7],r*i.m[8]+o*i.m[9]+n*i.m[10]+e*i.m[11],r*i.m[12]+o*i.m[13]+n*i.m[14]+e*i.m[15])},s.prototype.dotCoordinate=function(t){return this.normal.x*t.x+this.normal.y*t.y+this.normal.z*t.z+this.d},s.prototype.copyFromPoints=function(t,i,r){var o,n=i.x-t.x,e=i.y-t.y,s=i.z-t.z,h=r.x-t.x,a=r.y-t.y,u=r.z-t.z,m=e*u-s*a,y=s*h-n*u,c=n*a-e*h,p=Math.sqrt(m*m+y*y+c*c);return o=0!==p?1/p:0,this.normal.x=m*o,this.normal.y=y*o,this.normal.z=c*o,this.d=-(this.normal.x*t.x+this.normal.y*t.y+this.normal.z*t.z),this},s.prototype.isFrontFacingTo=function(t,i){return l.Dot(this.normal,t)<=i},s.prototype.signedDistanceTo=function(t){return l.Dot(t,this.normal)+this.d},s.FromArray=function(t){return new s(t[0],t[1],t[2],t[3])},s.FromPoints=function(t,i,r){var o=new s(0,0,0,0);return o.copyFromPoints(t,i,r),o},s.FromPositionAndNormal=function(t,i){var r=new s(0,0,0,0);return i.normalize(),r.normal=i,r.d=-(i.x*t.x+i.y*t.y+i.z*t.z),r},s.SignedDistanceToPlaneFromPositionAndNormal=function(t,i,r){var o=-(i.x*t.x+i.y*t.y+i.z*t.z);return l.Dot(r,i)+o},s}();p.Plane=n;var e=function(){function n(t,i,r,o){this.x=t,this.y=i,this.width=r,this.height=o}return n.prototype.toGlobal=function(t,i){if(t.getRenderWidth){var r=t;return this.toGlobal(r.getRenderWidth(),r.getRenderHeight())}var o=t;return new n(this.x*o,this.y*i,this.width*o,this.height*i)},n.prototype.clone=function(){return new n(this.x,this.y,this.width,this.height)},n}();p.Viewport=e;var s,h=function(){function o(){}return o.GetPlanes=function(t){for(var i=[],r=0;r<6;r++)i.push(new n(0,0,0,0));return o.GetPlanesToRef(t,i),i},o.GetNearPlaneToRef=function(t,i){i.normal.x=t.m[3]+t.m[2],i.normal.y=t.m[7]+t.m[6],i.normal.z=t.m[11]+t.m[10],i.d=t.m[15]+t.m[14],i.normalize()},o.GetFarPlaneToRef=function(t,i){i.normal.x=t.m[3]-t.m[2],i.normal.y=t.m[7]-t.m[6],i.normal.z=t.m[11]-t.m[10],i.d=t.m[15]-t.m[14],i.normalize()},o.GetLeftPlaneToRef=function(t,i){i.normal.x=t.m[3]+t.m[0],i.normal.y=t.m[7]+t.m[4],i.normal.z=t.m[11]+t.m[8],i.d=t.m[15]+t.m[12],i.normalize()},o.GetRightPlaneToRef=function(t,i){i.normal.x=t.m[3]-t.m[0],i.normal.y=t.m[7]-t.m[4],i.normal.z=t.m[11]-t.m[8],i.d=t.m[15]-t.m[12],i.normalize()},o.GetTopPlaneToRef=function(t,i){i.normal.x=t.m[3]-t.m[1],i.normal.y=t.m[7]-t.m[5],i.normal.z=t.m[11]-t.m[9],i.d=t.m[15]-t.m[13],i.normalize()},o.GetBottomPlaneToRef=function(t,i){i.normal.x=t.m[3]+t.m[1],i.normal.y=t.m[7]+t.m[5],i.normal.z=t.m[11]+t.m[9],i.d=t.m[15]+t.m[13],i.normalize()},o.GetPlanesToRef=function(t,i){o.GetNearPlaneToRef(t,i[0]),o.GetFarPlaneToRef(t,i[1]),o.GetLeftPlaneToRef(t,i[2]),o.GetRightPlaneToRef(t,i[3]),o.GetTopPlaneToRef(t,i[4]),o.GetBottomPlaneToRef(t,i[5])},o}();p.Frustum=h,(s=p.Space||(p.Space={}))[s.LOCAL=0]="LOCAL",s[s.WORLD=1]="WORLD",s[s.BONE=2]="BONE";var a=function(){function t(){}return t.X=new l(1,0,0),t.Y=new l(0,1,0),t.Z=new l(0,0,1),t}();p.Axis=a;var z,u,y=function(){function t(){}return t.Interpolate=function(t,i,r,o,n){for(var e=1-3*o+3*i,s=3*o-6*i,h=3*i,a=t,u=0;u<5;u++){var m=a*a;a-=(e*(m*a)+s*m+h*a-t)*(1/(3*e*m+2*s*a+h)),a=Math.min(1,Math.max(0,a))}return 3*Math.pow(1-a,2)*a*r+3*(1-a)*Math.pow(a,2)*n+Math.pow(a,3)},t}();p.BezierCurve=y,(u=z=p.Orientation||(p.Orientation={}))[u.CW=0]="CW",u[u.CCW=1]="CCW";var c=function(){function o(t){this._radians=t,this._radians<0&&(this._radians+=2*Math.PI)}return o.prototype.degrees=function(){return 180*this._radians/Math.PI},o.prototype.radians=function(){return this._radians},o.BetweenTwoPoints=function(t,i){var r=i.subtract(t);return new o(Math.atan2(r.y,r.x))},o.FromRadians=function(t){return new o(t)},o.FromDegrees=function(t){return new o(t*Math.PI/180)},o}();p.Angle=c;var w=function(t,i,r){this.startPoint=t,this.midPoint=i,this.endPoint=r;var o=Math.pow(i.x,2)+Math.pow(i.y,2),n=(Math.pow(t.x,2)+Math.pow(t.y,2)-o)/2,e=(o-Math.pow(r.x,2)-Math.pow(r.y,2))/2,s=(t.x-i.x)*(i.y-r.y)-(i.x-r.x)*(t.y-i.y);this.centerPoint=new f((n*(i.y-r.y)-e*(t.y-i.y))/s,((t.x-i.x)*e-(i.x-r.x)*n)/s),this.radius=this.centerPoint.subtract(this.startPoint).length(),this.startAngle=c.BetweenTwoPoints(this.centerPoint,this.startPoint);var h=this.startAngle.degrees(),a=c.BetweenTwoPoints(this.centerPoint,this.midPoint).degrees(),u=c.BetweenTwoPoints(this.centerPoint,this.endPoint).degrees();180<a-h&&(a-=360),a-h<-180&&(a+=360),180<u-a&&(u-=360),u-a<-180&&(u+=360),this.orientation=a-h<0?z.CW:z.CCW,this.angle=c.FromDegrees(this.orientation===z.CW?h-u:u-h)};p.Arc2=w;var d=function(){function r(t,i){this._points=new Array,this._length=0,this.closed=!1,this._points.push(new f(t,i))}return r.prototype.addLineTo=function(t,i){if(this.closed)return this;var r=new f(t,i),o=this._points[this._points.length-1];return this._points.push(r),this._length+=r.subtract(o).length(),this},r.prototype.addArcTo=function(t,i,r,o,n){if(void 0===n&&(n=36),this.closed)return this;var e=this._points[this._points.length-1],s=new f(t,i),h=new f(r,o),a=new w(e,s,h),u=a.angle.radians()/n;a.orientation===z.CW&&(u*=-1);for(var m=a.startAngle.radians()+u,y=0;y<n;y++){var c=Math.cos(m)*a.radius+a.centerPoint.x,p=Math.sin(m)*a.radius+a.centerPoint.y;this.addLineTo(c,p),m+=u}return this},r.prototype.close=function(){return this.closed=!0,this},r.prototype.length=function(){var t=this._length;if(!this.closed){var i=this._points[this._points.length-1];t+=this._points[0].subtract(i).length()}return t},r.prototype.getPoints=function(){return this._points},r.prototype.getPointAtLengthPosition=function(t){if(t<0||1<t)return f.Zero();for(var i=t*this.length(),r=0,o=0;o<this._points.length;o++){var n=(o+1)%this._points.length,e=this._points[o],s=this._points[n].subtract(e),h=s.length()+r;if(r<=i&&i<=h){var a=s.normalize(),u=i-r;return new f(e.x+a.x*u,e.y+a.y*u)}r=h}return f.Zero()},r.StartingAt=function(t,i){return new r(t,i)},r}();p.Path2=d;var v=function(){function t(t,i,r){void 0===i&&(i=null),this.path=t,this._curve=new Array,this._distances=new Array,this._tangents=new Array,this._normals=new Array,this._binormals=new Array;for(var o=0;o<t.length;o++)this._curve[o]=t[o].clone();this._raw=r||!1,this._compute(i)}return t.prototype.getCurve=function(){return this._curve},t.prototype.getTangents=function(){return this._tangents},t.prototype.getNormals=function(){return this._normals},t.prototype.getBinormals=function(){return this._binormals},t.prototype.getDistances=function(){return this._distances},t.prototype.update=function(t,i){void 0===i&&(i=null);for(var r=0;r<t.length;r++)this._curve[r].x=t[r].x,this._curve[r].y=t[r].y,this._curve[r].z=t[r].z;return this._compute(i),this},t.prototype._compute=function(t){var i=this._curve.length;this._tangents[0]=this._getFirstNonNullVector(0),this._raw||this._tangents[0].normalize(),this._tangents[i-1]=this._curve[i-1].subtract(this._curve[i-2]),this._raw||this._tangents[i-1].normalize();var r,o,n,e,s=this._tangents[0],h=this._normalVector(this._curve[0],s,t);this._normals[0]=h,this._raw||this._normals[0].normalize(),this._binormals[0]=l.Cross(s,this._normals[0]),this._raw||this._binormals[0].normalize(),this._distances[0]=0;for(var a=1;a<i;a++)r=this._getLastNonNullVector(a),a<i-1&&(o=this._getFirstNonNullVector(a),this._tangents[a]=r.add(o),this._tangents[a].normalize()),this._distances[a]=this._distances[a-1]+r.length(),n=this._tangents[a],e=this._binormals[a-1],this._normals[a]=l.Cross(e,n),this._raw||this._normals[a].normalize(),this._binormals[a]=l.Cross(n,this._normals[a]),this._raw||this._binormals[a].normalize()},t.prototype._getFirstNonNullVector=function(t){for(var i=1,r=this._curve[t+i].subtract(this._curve[t]);0===r.length()&&t+i+1<this._curve.length;)i++,r=this._curve[t+i].subtract(this._curve[t]);return r},t.prototype._getLastNonNullVector=function(t){for(var i=1,r=this._curve[t].subtract(this._curve[t-i]);0===r.length()&&i+1<t;)i++,r=this._curve[t].subtract(this._curve[t-i]);return r},t.prototype._normalVector=function(t,i,r){var o,n,e=i.length();(0===e&&(e=1),null==r)?(n=p.Scalar.WithinEpsilon(Math.abs(i.y)/e,1,p.Epsilon)?p.Scalar.WithinEpsilon(Math.abs(i.x)/e,1,p.Epsilon)?p.Scalar.WithinEpsilon(Math.abs(i.z)/e,1,p.Epsilon)?l.Zero():new l(0,0,1):new l(1,0,0):new l(0,-1,0),o=l.Cross(i,n)):(o=l.Cross(i,r),l.CrossToRef(o,i,o));return o.normalize(),o},t}();p.Path3D=v;var R=function(){function m(t){this._length=0,this._points=t,this._length=this._computeLength(t)}return m.CreateQuadraticBezier=function(t,i,r,o){o=2<o?o:3;for(var n=new Array,e=function(t,i,r,o){return(1-t)*(1-t)*i+2*t*(1-t)*r+t*t*o},s=0;s<=o;s++)n.push(new l(e(s/o,t.x,i.x,r.x),e(s/o,t.y,i.y,r.y),e(s/o,t.z,i.z,r.z)));return new m(n)},m.CreateCubicBezier=function(t,i,r,o,n){n=3<n?n:4;for(var e=new Array,s=function(t,i,r,o,n){return(1-t)*(1-t)*(1-t)*i+3*t*(1-t)*(1-t)*r+3*t*t*(1-t)*o+t*t*t*n},h=0;h<=n;h++)e.push(new l(s(h/n,t.x,i.x,r.x,o.x),s(h/n,t.y,i.y,r.y,o.y),s(h/n,t.z,i.z,r.z,o.z)));return new m(e)},m.CreateHermiteSpline=function(t,i,r,o,n){for(var e=new Array,s=1/n,h=0;h<=n;h++)e.push(l.Hermite(t,i,r,o,h*s));return new m(e)},m.CreateCatmullRomSpline=function(t,i,r){var o=new Array,n=1/i,e=0;if(r){for(var s=t.length,h=0;h<s;h++)for(var a=e=0;a<i;a++)o.push(l.CatmullRom(t[h%s],t[(h+1)%s],t[(h+2)%s],t[(h+3)%s],e)),e+=n;o.push(o[0])}else{var u=new Array;u.push(t[0].clone()),Array.prototype.push.apply(u,t),u.push(t[t.length-1].clone());for(h=0;h<u.length-3;h++)for(a=e=0;a<i;a++)o.push(l.CatmullRom(u[h],u[h+1],u[h+2],u[h+3],e)),e+=n;h--,o.push(l.CatmullRom(u[h],u[h+1],u[h+2],u[h+3],e))}return new m(o)},m.prototype.getPoints=function(){return this._points},m.prototype.length=function(){return this._length},m.prototype.continue=function(t){for(var i=this._points[this._points.length-1],r=this._points.slice(),o=t.getPoints(),n=1;n<o.length;n++)r.push(o[n].subtract(o[0]).add(i));return new m(r)},m.prototype._computeLength=function(t){for(var i=0,r=1;r<t.length;r++)i+=t[r].subtract(t[r-1]).length();return i},m}();p.Curve3=R;var T=function(){function t(t,i){void 0===t&&(t=l.Zero()),void 0===i&&(i=l.Up()),this.position=t,this.normal=i}return t.prototype.clone=function(){return new t(this.position.clone(),this.normal.clone())},t}();p.PositionNormalVertex=T;var g=function(){function t(t,i,r){void 0===t&&(t=l.Zero()),void 0===i&&(i=l.Up()),void 0===r&&(r=f.Zero()),this.position=t,this.normal=i,this.uv=r}return t.prototype.clone=function(){return new t(this.position.clone(),this.normal.clone(),this.uv.clone())},t}();p.PositionNormalTextureVertex=g;var A=function(){function t(){}return t.Color3=[i.Black(),i.Black(),i.Black()],t.Color4=[new r(0,0,0,0),new r(0,0,0,0)],t.Vector2=[f.Zero(),f.Zero(),f.Zero()],t.Vector3=[l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero()],t.Vector4=[o.Zero(),o.Zero(),o.Zero()],t.Quaternion=[x.Zero(),x.Zero()],t.Matrix=[m.Zero(),m.Zero(),m.Zero(),m.Zero(),m.Zero(),m.Zero(),m.Zero(),m.Zero()],t}();p.Tmp=A;var _=function(){function t(){}return t.Vector3=[l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero(),l.Zero()],t.Matrix=[m.Zero(),m.Zero()],t.Quaternion=[x.Zero(),x.Zero(),x.Zero()],t}()}(BABYLON||(BABYLON={}));';var tl="undefined"!=typeof global?global:"undefined"!=typeof window?window:this;return tl.BABYLON=$a,void 0!==_&&(tl.Earcut={earcut:_}),$a}));

!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("babylonjs")):"function"==typeof define&&define.amd?define("babylonjs-gui",["babylonjs"],e):"object"==typeof exports?exports["babylonjs-gui"]=e(require("babylonjs")):(t.BABYLON=t.BABYLON||{},t.BABYLON.GUI=e(t.BABYLON))}(window,function(t){return function(t){var e={};function i(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,i),o.l=!0,o.exports}return i.m=t,i.c=e,i.d=function(t,e,r){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(i.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)i.d(r,o,function(e){return t[e]}.bind(null,o));return r},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="",i(i.s=27)}([function(e,i){e.exports=t},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(2),o=i(0),n=i(7),s=i(17),a=function(){function t(e){this.name=e,this._alpha=1,this._alphaSet=!1,this._zIndex=0,this._currentMeasure=n.Measure.Empty(),this._fontFamily="Arial",this._fontStyle="",this._fontWeight="",this._fontSize=new r.ValueAndUnit(18,r.ValueAndUnit.UNITMODE_PIXEL,!1),this._width=new r.ValueAndUnit(1,r.ValueAndUnit.UNITMODE_PERCENTAGE,!1),this._height=new r.ValueAndUnit(1,r.ValueAndUnit.UNITMODE_PERCENTAGE,!1),this._color="",this._style=null,this._horizontalAlignment=t.HORIZONTAL_ALIGNMENT_CENTER,this._verticalAlignment=t.VERTICAL_ALIGNMENT_CENTER,this._isDirty=!0,this._tempParentMeasure=n.Measure.Empty(),this._cachedParentMeasure=n.Measure.Empty(),this._paddingLeft=new r.ValueAndUnit(0),this._paddingRight=new r.ValueAndUnit(0),this._paddingTop=new r.ValueAndUnit(0),this._paddingBottom=new r.ValueAndUnit(0),this._left=new r.ValueAndUnit(0),this._top=new r.ValueAndUnit(0),this._scaleX=1,this._scaleY=1,this._rotation=0,this._transformCenterX=.5,this._transformCenterY=.5,this._transformMatrix=s.Matrix2D.Identity(),this._invertTransformMatrix=s.Matrix2D.Identity(),this._transformedPosition=o.Vector2.Zero(),this._onlyMeasureMode=!1,this._isMatrixDirty=!0,this._isVisible=!0,this._fontSet=!1,this._dummyVector2=o.Vector2.Zero(),this._downCount=0,this._enterCount=-1,this._doNotRender=!1,this._downPointerIds={},this._isEnabled=!0,this._disabledColor="#9a9a9a",this.isHitTestVisible=!0,this.isPointerBlocker=!1,this.isFocusInvisible=!1,this.shadowOffsetX=0,this.shadowOffsetY=0,this.shadowBlur=0,this.shadowColor="#000",this.hoverCursor="",this._linkOffsetX=new r.ValueAndUnit(0),this._linkOffsetY=new r.ValueAndUnit(0),this.onPointerMoveObservable=new o.Observable,this.onPointerOutObservable=new o.Observable,this.onPointerDownObservable=new o.Observable,this.onPointerUpObservable=new o.Observable,this.onPointerClickObservable=new o.Observable,this.onPointerEnterObservable=new o.Observable,this.onDirtyObservable=new o.Observable,this.onAfterDrawObservable=new o.Observable}return Object.defineProperty(t.prototype,"typeName",{get:function(){return this._getTypeName()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontOffset",{get:function(){return this._fontOffset},set:function(t){this._fontOffset=t},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"alpha",{get:function(){return this._alpha},set:function(t){this._alpha!==t&&(this._alphaSet=!0,this._alpha=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaleX",{get:function(){return this._scaleX},set:function(t){this._scaleX!==t&&(this._scaleX=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaleY",{get:function(){return this._scaleY},set:function(t){this._scaleY!==t&&(this._scaleY=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"rotation",{get:function(){return this._rotation},set:function(t){this._rotation!==t&&(this._rotation=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"transformCenterY",{get:function(){return this._transformCenterY},set:function(t){this._transformCenterY!==t&&(this._transformCenterY=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"transformCenterX",{get:function(){return this._transformCenterX},set:function(t){this._transformCenterX!==t&&(this._transformCenterX=t,this._markAsDirty(),this._markMatrixAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"horizontalAlignment",{get:function(){return this._horizontalAlignment},set:function(t){this._horizontalAlignment!==t&&(this._horizontalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"verticalAlignment",{get:function(){return this._verticalAlignment},set:function(t){this._verticalAlignment!==t&&(this._verticalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._width.toString(this._host)!==t&&this._width.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"widthInPixels",{get:function(){return this._width.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"height",{get:function(){return this._height.toString(this._host)},set:function(t){this._height.toString(this._host)!==t&&this._height.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"heightInPixels",{get:function(){return this._height.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontFamily",{get:function(){return this._fontFamily},set:function(t){this._fontFamily!==t&&(this._fontFamily=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontStyle",{get:function(){return this._fontStyle},set:function(t){this._fontStyle!==t&&(this._fontStyle=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontWeight",{get:function(){return this._fontWeight},set:function(t){this._fontWeight!==t&&(this._fontWeight=t,this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"style",{get:function(){return this._style},set:function(t){var e=this;this._style&&(this._style.onChangedObservable.remove(this._styleObserver),this._styleObserver=null),this._style=t,this._style&&(this._styleObserver=this._style.onChangedObservable.add(function(){e._markAsDirty(),e._resetFontCache()})),this._markAsDirty(),this._resetFontCache()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"_isFontSizeInPercentage",{get:function(){return this._fontSize.isPercentage},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontSizeInPixels",{get:function(){var t=this._style?this._style._fontSize:this._fontSize;return t.isPixel?t.getValue(this._host):t.getValueInPixel(this._host,this._tempParentMeasure.height||this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontSize",{get:function(){return this._fontSize.toString(this._host)},set:function(t){this._fontSize.toString(this._host)!==t&&this._fontSize.fromString(t)&&(this._markAsDirty(),this._resetFontCache())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"color",{get:function(){return this._color},set:function(t){this._color!==t&&(this._color=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"zIndex",{get:function(){return this._zIndex},set:function(t){this.zIndex!==t&&(this._zIndex=t,this._root&&this._root._reOrderControl(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"notRenderable",{get:function(){return this._doNotRender},set:function(t){this._doNotRender!==t&&(this._doNotRender=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isVisible",{get:function(){return this._isVisible},set:function(t){this._isVisible!==t&&(this._isVisible=t,this._markAsDirty(!0))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isDirty",{get:function(){return this._isDirty},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkedMesh",{get:function(){return this._linkedMesh},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingLeft",{get:function(){return this._paddingLeft.toString(this._host)},set:function(t){this._paddingLeft.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingLeftInPixels",{get:function(){return this._paddingLeft.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingRight",{get:function(){return this._paddingRight.toString(this._host)},set:function(t){this._paddingRight.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingRightInPixels",{get:function(){return this._paddingRight.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingTop",{get:function(){return this._paddingTop.toString(this._host)},set:function(t){this._paddingTop.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingTopInPixels",{get:function(){return this._paddingTop.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingBottom",{get:function(){return this._paddingBottom.toString(this._host)},set:function(t){this._paddingBottom.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"paddingBottomInPixels",{get:function(){return this._paddingBottom.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"left",{get:function(){return this._left.toString(this._host)},set:function(t){this._left.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"leftInPixels",{get:function(){return this._left.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"top",{get:function(){return this._top.toString(this._host)},set:function(t){this._top.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"topInPixels",{get:function(){return this._top.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetX",{get:function(){return this._linkOffsetX.toString(this._host)},set:function(t){this._linkOffsetX.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetXInPixels",{get:function(){return this._linkOffsetX.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetY",{get:function(){return this._linkOffsetY.toString(this._host)},set:function(t){this._linkOffsetY.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"linkOffsetYInPixels",{get:function(){return this._linkOffsetY.getValueInPixel(this._host,this._cachedParentMeasure.height)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"centerX",{get:function(){return this._currentMeasure.left+this._currentMeasure.width/2},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"centerY",{get:function(){return this._currentMeasure.top+this._currentMeasure.height/2},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isEnabled",{get:function(){return this._isEnabled},set:function(t){this._isEnabled!==t&&(this._isEnabled=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"disabledColor",{get:function(){return this._disabledColor},set:function(t){this._disabledColor!==t&&(this._disabledColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),t.prototype._getTypeName=function(){return"Control"},t.prototype._resetFontCache=function(){this._fontSet=!0,this._markAsDirty()},t.prototype.isAscendant=function(t){return!!this.parent&&(this.parent===t||this.parent.isAscendant(t))},t.prototype.getLocalCoordinates=function(t){var e=o.Vector2.Zero();return this.getLocalCoordinatesToRef(t,e),e},t.prototype.getLocalCoordinatesToRef=function(t,e){return e.x=t.x-this._currentMeasure.left,e.y=t.y-this._currentMeasure.top,this},t.prototype.getParentLocalCoordinates=function(t){var e=o.Vector2.Zero();return e.x=t.x-this._cachedParentMeasure.left,e.y=t.y-this._cachedParentMeasure.top,e},t.prototype.moveToVector3=function(e,i){if(this._host&&this._root===this._host._rootContainer){this.horizontalAlignment=t.HORIZONTAL_ALIGNMENT_LEFT,this.verticalAlignment=t.VERTICAL_ALIGNMENT_TOP;var r=this._host._getGlobalViewport(i),n=o.Vector3.Project(e,o.Matrix.Identity(),i.getTransformMatrix(),r);this._moveToProjectedPosition(n),n.z<0||n.z>1?this.notRenderable=!0:this.notRenderable=!1}else o.Tools.Error("Cannot move a control to a vector3 if the control is not at root level")},t.prototype.linkWithMesh=function(e){if(!this._host||this._root&&this._root!==this._host._rootContainer)e&&o.Tools.Error("Cannot link a control to a mesh if the control is not at root level");else{var i=this._host._linkedControls.indexOf(this);if(-1!==i)return this._linkedMesh=e,void(e||this._host._linkedControls.splice(i,1));e&&(this.horizontalAlignment=t.HORIZONTAL_ALIGNMENT_LEFT,this.verticalAlignment=t.VERTICAL_ALIGNMENT_TOP,this._linkedMesh=e,this._onlyMeasureMode=0===this._currentMeasure.width||0===this._currentMeasure.height,this._host._linkedControls.push(this))}},t.prototype._moveToProjectedPosition=function(t){var e=this._left.getValue(this._host),i=this._top.getValue(this._host),r=t.x+this._linkOffsetX.getValue(this._host)-this._currentMeasure.width/2,o=t.y+this._linkOffsetY.getValue(this._host)-this._currentMeasure.height/2;this._left.ignoreAdaptiveScaling&&this._top.ignoreAdaptiveScaling&&(Math.abs(r-e)<.5&&(r=e),Math.abs(o-i)<.5&&(o=i)),this.left=r+"px",this.top=o+"px",this._left.ignoreAdaptiveScaling=!0,this._top.ignoreAdaptiveScaling=!0},t.prototype._markMatrixAsDirty=function(){this._isMatrixDirty=!0,this._flagDescendantsAsMatrixDirty()},t.prototype._flagDescendantsAsMatrixDirty=function(){},t.prototype._markAsDirty=function(t){void 0===t&&(t=!1),(this._isVisible||t)&&(this._isDirty=!0,this._host&&this._host.markAsDirty())},t.prototype._markAllAsDirty=function(){this._markAsDirty(),this._font&&this._prepareFont()},t.prototype._link=function(t,e){this._root=t,this._host=e},t.prototype._transform=function(t){if(this._isMatrixDirty||1!==this._scaleX||1!==this._scaleY||0!==this._rotation){var e=this._currentMeasure.width*this._transformCenterX+this._currentMeasure.left,i=this._currentMeasure.height*this._transformCenterY+this._currentMeasure.top;t.translate(e,i),t.rotate(this._rotation),t.scale(this._scaleX,this._scaleY),t.translate(-e,-i),(this._isMatrixDirty||this._cachedOffsetX!==e||this._cachedOffsetY!==i)&&(this._cachedOffsetX=e,this._cachedOffsetY=i,this._isMatrixDirty=!1,this._flagDescendantsAsMatrixDirty(),s.Matrix2D.ComposeToRef(-e,-i,this._rotation,this._scaleX,this._scaleY,this._root?this._root._transformMatrix:null,this._transformMatrix),this._transformMatrix.invertToRef(this._invertTransformMatrix))}},t.prototype._applyStates=function(t){this._isFontSizeInPercentage&&(this._fontSet=!0),this._fontSet&&(this._prepareFont(),this._fontSet=!1),this._font&&(t.font=this._font),this._color&&(t.fillStyle=this._color),this._alphaSet&&(t.globalAlpha=this.parent?this.parent.alpha*this._alpha:this._alpha)},t.prototype._processMeasures=function(t,e){return!this._isDirty&&this._cachedParentMeasure.isEqualsTo(t)||(this._isDirty=!1,this._currentMeasure.copyFrom(t),this._preMeasure(t,e),this._measure(),this._computeAlignment(t,e),this._currentMeasure.left=0|this._currentMeasure.left,this._currentMeasure.top=0|this._currentMeasure.top,this._currentMeasure.width=0|this._currentMeasure.width,this._currentMeasure.height=0|this._currentMeasure.height,this._additionalProcessing(t,e),this._cachedParentMeasure.copyFrom(t),this.onDirtyObservable.hasObservers()&&this.onDirtyObservable.notifyObservers(this)),!(this._currentMeasure.left>t.left+t.width)&&(!(this._currentMeasure.left+this._currentMeasure.width<t.left)&&(!(this._currentMeasure.top>t.top+t.height)&&(!(this._currentMeasure.top+this._currentMeasure.height<t.top)&&(this._transform(e),this._onlyMeasureMode?(this._onlyMeasureMode=!1,!1):(this._clip(e),e.clip(),!0)))))},t.prototype._clip=function(t){if(t.beginPath(),this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY){var e=this.shadowOffsetX,i=this.shadowOffsetY,r=this.shadowBlur,o=Math.min(Math.min(e,0)-2*r,0),n=Math.max(Math.max(e,0)+2*r,0),s=Math.min(Math.min(i,0)-2*r,0),a=Math.max(Math.max(i,0)+2*r,0);t.rect(this._currentMeasure.left+o,this._currentMeasure.top+s,this._currentMeasure.width+n-o,this._currentMeasure.height+a-s)}else t.rect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)},t.prototype._measure=function(){this._width.isPixel?this._currentMeasure.width=this._width.getValue(this._host):this._currentMeasure.width*=this._width.getValue(this._host),this._height.isPixel?this._currentMeasure.height=this._height.getValue(this._host):this._currentMeasure.height*=this._height.getValue(this._host)},t.prototype._computeAlignment=function(e,i){var r=this._currentMeasure.width,o=this._currentMeasure.height,n=e.width,s=e.height,a=0,h=0;switch(this.horizontalAlignment){case t.HORIZONTAL_ALIGNMENT_LEFT:a=0;break;case t.HORIZONTAL_ALIGNMENT_RIGHT:a=n-r;break;case t.HORIZONTAL_ALIGNMENT_CENTER:a=(n-r)/2}switch(this.verticalAlignment){case t.VERTICAL_ALIGNMENT_TOP:h=0;break;case t.VERTICAL_ALIGNMENT_BOTTOM:h=s-o;break;case t.VERTICAL_ALIGNMENT_CENTER:h=(s-o)/2}this._paddingLeft.isPixel?(this._currentMeasure.left+=this._paddingLeft.getValue(this._host),this._currentMeasure.width-=this._paddingLeft.getValue(this._host)):(this._currentMeasure.left+=n*this._paddingLeft.getValue(this._host),this._currentMeasure.width-=n*this._paddingLeft.getValue(this._host)),this._paddingRight.isPixel?this._currentMeasure.width-=this._paddingRight.getValue(this._host):this._currentMeasure.width-=n*this._paddingRight.getValue(this._host),this._paddingTop.isPixel?(this._currentMeasure.top+=this._paddingTop.getValue(this._host),this._currentMeasure.height-=this._paddingTop.getValue(this._host)):(this._currentMeasure.top+=s*this._paddingTop.getValue(this._host),this._currentMeasure.height-=s*this._paddingTop.getValue(this._host)),this._paddingBottom.isPixel?this._currentMeasure.height-=this._paddingBottom.getValue(this._host):this._currentMeasure.height-=s*this._paddingBottom.getValue(this._host),this._left.isPixel?this._currentMeasure.left+=this._left.getValue(this._host):this._currentMeasure.left+=n*this._left.getValue(this._host),this._top.isPixel?this._currentMeasure.top+=this._top.getValue(this._host):this._currentMeasure.top+=s*this._top.getValue(this._host),this._currentMeasure.left+=a,this._currentMeasure.top+=h},t.prototype._preMeasure=function(t,e){},t.prototype._additionalProcessing=function(t,e){},t.prototype._draw=function(t,e){},t.prototype.contains=function(t,e){return this._invertTransformMatrix.transformCoordinates(t,e,this._transformedPosition),t=this._transformedPosition.x,e=this._transformedPosition.y,!(t<this._currentMeasure.left)&&(!(t>this._currentMeasure.left+this._currentMeasure.width)&&(!(e<this._currentMeasure.top)&&(!(e>this._currentMeasure.top+this._currentMeasure.height)&&(this.isPointerBlocker&&(this._host._shouldBlockPointer=!0),!0))))},t.prototype._processPicking=function(t,e,i,r,o){return!!this._isEnabled&&(!(!this.isHitTestVisible||!this.isVisible||this._doNotRender)&&(!!this.contains(t,e)&&(this._processObservables(i,t,e,r,o),!0)))},t.prototype._onPointerMove=function(t,e){this.onPointerMoveObservable.notifyObservers(e,-1,t,this)&&null!=this.parent&&this.parent._onPointerMove(t,e)},t.prototype._onPointerEnter=function(t){return!!this._isEnabled&&(!(this._enterCount>0)&&(-1===this._enterCount&&(this._enterCount=0),this._enterCount++,this.onPointerEnterObservable.notifyObservers(this,-1,t,this)&&null!=this.parent&&this.parent._onPointerEnter(t),!0))},t.prototype._onPointerOut=function(t){this._isEnabled&&(this._enterCount=0,this.onPointerOutObservable.notifyObservers(this,-1,t,this)&&null!=this.parent&&this.parent._onPointerOut(t))},t.prototype._onPointerDown=function(t,e,i,r){return this._onPointerEnter(this),0===this._downCount&&(this._downCount++,this._downPointerIds[i]=!0,this.onPointerDownObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)&&null!=this.parent&&this.parent._onPointerDown(t,e,i,r),!0)},t.prototype._onPointerUp=function(t,e,i,r,o){if(this._isEnabled){this._downCount=0,delete this._downPointerIds[i];var n=o;o&&(this._enterCount>0||-1===this._enterCount)&&(n=this.onPointerClickObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)),this.onPointerUpObservable.notifyObservers(new s.Vector2WithInfo(e,r),-1,t,this)&&null!=this.parent&&this.parent._onPointerUp(t,e,i,r,n)}},t.prototype._forcePointerUp=function(t){if(void 0===t&&(t=null),null!==t)this._onPointerUp(this,o.Vector2.Zero(),t,0,!0);else for(var e in this._downPointerIds)this._onPointerUp(this,o.Vector2.Zero(),+e,0,!0)},t.prototype._processObservables=function(t,e,i,r,n){if(!this._isEnabled)return!1;if(this._dummyVector2.copyFromFloats(e,i),t===o.PointerEventTypes.POINTERMOVE){this._onPointerMove(this,this._dummyVector2);var s=this._host._lastControlOver[r];return s&&s!==this&&s._onPointerOut(this),s!==this&&this._onPointerEnter(this),this._host._lastControlOver[r]=this,!0}return t===o.PointerEventTypes.POINTERDOWN?(this._onPointerDown(this,this._dummyVector2,r,n),this._host._lastControlDown[r]=this,this._host._lastPickedControl=this,!0):t===o.PointerEventTypes.POINTERUP&&(this._host._lastControlDown[r]&&this._host._lastControlDown[r]._onPointerUp(this,this._dummyVector2,r,n,!0),delete this._host._lastControlDown[r],!0)},t.prototype._prepareFont=function(){(this._font||this._fontSet)&&(this._style?this._font=this._style.fontStyle+" "+this._style.fontWeight+" "+this.fontSizeInPixels+"px "+this._style.fontFamily:this._font=this._fontStyle+" "+this._fontWeight+" "+this.fontSizeInPixels+"px "+this._fontFamily,this._fontOffset=t._GetFontOffset(this._font))},t.prototype.dispose=function(){(this.onDirtyObservable.clear(),this.onAfterDrawObservable.clear(),this.onPointerDownObservable.clear(),this.onPointerEnterObservable.clear(),this.onPointerMoveObservable.clear(),this.onPointerOutObservable.clear(),this.onPointerUpObservable.clear(),this.onPointerClickObservable.clear(),this._styleObserver&&this._style&&(this._style.onChangedObservable.remove(this._styleObserver),this._styleObserver=null),this._root&&(this._root.removeControl(this),this._root=null),this._host)&&(this._host._linkedControls.indexOf(this)>-1&&this.linkWithMesh(null))},Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_LEFT",{get:function(){return t._HORIZONTAL_ALIGNMENT_LEFT},enumerable:!0,configurable:!0}),Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_RIGHT",{get:function(){return t._HORIZONTAL_ALIGNMENT_RIGHT},enumerable:!0,configurable:!0}),Object.defineProperty(t,"HORIZONTAL_ALIGNMENT_CENTER",{get:function(){return t._HORIZONTAL_ALIGNMENT_CENTER},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_TOP",{get:function(){return t._VERTICAL_ALIGNMENT_TOP},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_BOTTOM",{get:function(){return t._VERTICAL_ALIGNMENT_BOTTOM},enumerable:!0,configurable:!0}),Object.defineProperty(t,"VERTICAL_ALIGNMENT_CENTER",{get:function(){return t._VERTICAL_ALIGNMENT_CENTER},enumerable:!0,configurable:!0}),t._GetFontOffset=function(e){if(t._FontHeightSizes[e])return t._FontHeightSizes[e];var i=document.createElement("span");i.innerHTML="Hg",i.style.font=e;var r=document.createElement("div");r.style.display="inline-block",r.style.width="1px",r.style.height="0px",r.style.verticalAlign="bottom";var o=document.createElement("div");o.appendChild(i),o.appendChild(r),document.body.appendChild(o);var n=0,s=0;try{s=r.getBoundingClientRect().top-i.getBoundingClientRect().top,r.style.verticalAlign="baseline",n=r.getBoundingClientRect().top-i.getBoundingClientRect().top}finally{document.body.removeChild(o)}var a={ascent:n,height:s,descent:s-n};return t._FontHeightSizes[e]=a,a},t.drawEllipse=function(t,e,i,r,o){o.translate(t,e),o.scale(i,r),o.beginPath(),o.arc(0,0,1,0,2*Math.PI),o.closePath(),o.scale(1/i,1/r),o.translate(-t,-e)},t._HORIZONTAL_ALIGNMENT_LEFT=0,t._HORIZONTAL_ALIGNMENT_RIGHT=1,t._HORIZONTAL_ALIGNMENT_CENTER=2,t._VERTICAL_ALIGNMENT_TOP=0,t._VERTICAL_ALIGNMENT_BOTTOM=1,t._VERTICAL_ALIGNMENT_CENTER=2,t._FontHeightSizes={},t.AddHeader=function(){},t}();e.Control=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=function(){function t(e,i,r){void 0===i&&(i=t.UNITMODE_PIXEL),void 0===r&&(r=!0),this.unit=i,this.negativeValueAllowed=r,this._value=1,this.ignoreAdaptiveScaling=!1,this._value=e}return Object.defineProperty(t.prototype,"isPercentage",{get:function(){return this.unit===t.UNITMODE_PERCENTAGE},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isPixel",{get:function(){return this.unit===t.UNITMODE_PIXEL},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"internalValue",{get:function(){return this._value},enumerable:!0,configurable:!0}),t.prototype.getValueInPixel=function(t,e){return this.isPixel?this.getValue(t):this.getValue(t)*e},t.prototype.getValue=function(e){if(e&&!this.ignoreAdaptiveScaling&&this.unit!==t.UNITMODE_PERCENTAGE){var i=0,r=0;if(e.idealWidth&&(i=this._value*e.getSize().width/e.idealWidth),e.idealHeight&&(r=this._value*e.getSize().height/e.idealHeight),e.useSmallestIdeal&&e.idealWidth&&e.idealHeight)return window.innerWidth<window.innerHeight?i:r;if(e.idealWidth)return i;if(e.idealHeight)return r}return this._value},t.prototype.toString=function(e){switch(this.unit){case t.UNITMODE_PERCENTAGE:return 100*this.getValue(e)+"%";case t.UNITMODE_PIXEL:return this.getValue(e)+"px"}return this.unit.toString()},t.prototype.fromString=function(e){var i=t._Regex.exec(e.toString());if(!i||0===i.length)return!1;var r=parseFloat(i[1]),o=this.unit;if(this.negativeValueAllowed||r<0&&(r=0),4===i.length)switch(i[3]){case"px":o=t.UNITMODE_PIXEL;break;case"%":o=t.UNITMODE_PERCENTAGE,r/=100}return(r!==this._value||o!==this.unit)&&(this._value=r,this.unit=o,!0)},Object.defineProperty(t,"UNITMODE_PERCENTAGE",{get:function(){return t._UNITMODE_PERCENTAGE},enumerable:!0,configurable:!0}),Object.defineProperty(t,"UNITMODE_PIXEL",{get:function(){return t._UNITMODE_PIXEL},enumerable:!0,configurable:!0}),t._Regex=/(^-?\d*(\.\d+)?)(%|px)?/,t._UNITMODE_PERCENTAGE=0,t._UNITMODE_PIXEL=1,t}();e.ValueAndUnit=r},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(13),n=i(0),s=function(t){function e(e){var i=t.call(this,e)||this;return i._blockLayout=!1,i._children=new Array,i}return r(e,t),Object.defineProperty(e.prototype,"children",{get:function(){return this._children},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"blockLayout",{get:function(){return this._blockLayout},set:function(t){this._blockLayout!==t&&(this._blockLayout=t,this._blockLayout||this._arrangeChildren())},enumerable:!0,configurable:!0}),e.prototype.updateLayout=function(){return this._arrangeChildren(),this},e.prototype.containsControl=function(t){return-1!==this._children.indexOf(t)},e.prototype.addControl=function(t){return-1!==this._children.indexOf(t)?this:(t.parent=this,t._host=this._host,this._children.push(t),this._host.utilityLayer&&(t._prepareNode(this._host.utilityLayer.utilityLayerScene),t.node&&(t.node.parent=this.node),this.blockLayout||this._arrangeChildren()),this)},e.prototype._arrangeChildren=function(){},e.prototype._createNode=function(t){return new n.TransformNode("ContainerNode",t)},e.prototype.removeControl=function(t){var e=this._children.indexOf(t);return-1!==e&&(this._children.splice(e,1),t.parent=null,t._disposeNode()),this},e.prototype._getTypeName=function(){return"Container3D"},e.prototype.dispose=function(){for(var e=0,i=this._children;e<i.length;e++){i[e].dispose()}this._children=[],t.prototype.dispose.call(this)},e.UNSET_ORIENTATION=0,e.FACEORIGIN_ORIENTATION=1,e.FACEORIGINREVERSED_ORIENTATION=2,e.FACEFORWARD_ORIENTATION=3,e.FACEFORWARDREVERSED_ORIENTATION=4,e}(o.Control3D);e.Container3D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(7),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._children=new Array,i._measureForChildren=n.Measure.Empty(),i._adaptWidthToChildren=!1,i._adaptHeightToChildren=!1,i}return r(e,t),Object.defineProperty(e.prototype,"adaptHeightToChildren",{get:function(){return this._adaptHeightToChildren},set:function(t){this._adaptHeightToChildren!==t&&(this._adaptHeightToChildren=t,t&&(this.height="100%"),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"adaptWidthToChildren",{get:function(){return this._adaptWidthToChildren},set:function(t){this._adaptWidthToChildren!==t&&(this._adaptWidthToChildren=t,t&&(this.width="100%"),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"children",{get:function(){return this._children},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Container"},e.prototype._flagDescendantsAsMatrixDirty=function(){for(var t=0,e=this.children;t<e.length;t++){e[t]._markMatrixAsDirty()}},e.prototype.getChildByName=function(t){for(var e=0,i=this.children;e<i.length;e++){var r=i[e];if(r.name===t)return r}return null},e.prototype.getChildByType=function(t,e){for(var i=0,r=this.children;i<r.length;i++){var o=r[i];if(o.typeName===e)return o}return null},e.prototype.containsControl=function(t){return-1!==this.children.indexOf(t)},e.prototype.addControl=function(t){return t?-1!==this._children.indexOf(t)?this:(t._link(this,this._host),t._markAllAsDirty(),this._reOrderControl(t),this._markAsDirty(),this):this},e.prototype.clearControls=function(){for(var t=0,e=this._children.slice();t<e.length;t++){var i=e[t];this.removeControl(i)}return this},e.prototype.removeControl=function(t){var e=this._children.indexOf(t);return-1!==e&&(this._children.splice(e,1),t.parent=null),t.linkWithMesh(null),this._host&&this._host._cleanControlAfterRemoval(t),this._markAsDirty(),this},e.prototype._reOrderControl=function(t){this.removeControl(t);for(var e=0;e<this._children.length;e++)if(this._children[e].zIndex>t.zIndex)return void this._children.splice(e,0,t);this._children.push(t),t.parent=this,this._markAsDirty()},e.prototype._markAllAsDirty=function(){t.prototype._markAllAsDirty.call(this);for(var e=0;e<this._children.length;e++)this._children[e]._markAllAsDirty()},e.prototype._localDraw=function(t){this._background&&((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),t.fillStyle=this._background,t.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0))},e.prototype._link=function(e,i){t.prototype._link.call(this,e,i);for(var r=0,o=this._children;r<o.length;r++){o[r]._link(this,i)}},e.prototype._draw=function(t,e){if(this.isVisible&&!this.notRenderable){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){this._localDraw(e),this._clipForChildren(e);for(var i=-1,r=-1,o=0,n=this._children;o<n.length;o++){var s=n[o];s.isVisible&&!s.notRenderable&&(s._tempParentMeasure.copyFrom(this._measureForChildren),s._draw(this._measureForChildren,e),s.onAfterDrawObservable.hasObservers()&&s.onAfterDrawObservable.notifyObservers(s),this.adaptWidthToChildren&&s._width.isPixel&&(i=Math.max(i,s._currentMeasure.width)),this.adaptHeightToChildren&&s._height.isPixel&&(r=Math.max(r,s._currentMeasure.height)))}this.adaptWidthToChildren&&i>=0&&(this.width=i+"px"),this.adaptHeightToChildren&&r>=0&&(this.height=r+"px")}e.restore(),this.onAfterDrawObservable.hasObservers()&&this.onAfterDrawObservable.notifyObservers(this)}},e.prototype._processPicking=function(e,i,r,o,n){if(!this.isVisible||this.notRenderable)return!1;if(!t.prototype.contains.call(this,e,i))return!1;for(var s=this._children.length-1;s>=0;s--){var a=this._children[s];if(a._processPicking(e,i,r,o,n))return a.hoverCursor&&this._host._changeCursor(a.hoverCursor),!0}return!!this.isHitTestVisible&&this._processObservables(r,e,i,o,n)},e.prototype._clipForChildren=function(t){},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.copyFrom(this._currentMeasure)},e.prototype.dispose=function(){t.prototype.dispose.call(this);for(var e=0,i=this._children;e<i.length;e++){i[e].dispose()}},e}(o.Control);e.Container=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o,n=i(0),s=i(2),a=i(1);!function(t){t[t.Clip=0]="Clip",t[t.WordWrap=1]="WordWrap",t[t.Ellipsis=2]="Ellipsis"}(o=e.TextWrapping||(e.TextWrapping={}));var h=function(t){function e(e,i){void 0===i&&(i="");var r=t.call(this,e)||this;return r.name=e,r._text="",r._textWrapping=o.Clip,r._textHorizontalAlignment=a.Control.HORIZONTAL_ALIGNMENT_CENTER,r._textVerticalAlignment=a.Control.VERTICAL_ALIGNMENT_CENTER,r._resizeToFit=!1,r._lineSpacing=new s.ValueAndUnit(0),r._outlineWidth=0,r._outlineColor="white",r.onTextChangedObservable=new n.Observable,r.onLinesReadyObservable=new n.Observable,r.text=i,r}return r(e,t),Object.defineProperty(e.prototype,"lines",{get:function(){return this._lines},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"resizeToFit",{get:function(){return this._resizeToFit},set:function(t){this._resizeToFit=t,this._resizeToFit&&(this._width.ignoreAdaptiveScaling=!0,this._height.ignoreAdaptiveScaling=!0)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textWrapping",{get:function(){return this._textWrapping},set:function(t){this._textWrapping!==t&&(this._textWrapping=+t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._markAsDirty(),this.onTextChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textHorizontalAlignment",{get:function(){return this._textHorizontalAlignment},set:function(t){this._textHorizontalAlignment!==t&&(this._textHorizontalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"textVerticalAlignment",{get:function(){return this._textVerticalAlignment},set:function(t){this._textVerticalAlignment!==t&&(this._textVerticalAlignment=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"lineSpacing",{get:function(){return this._lineSpacing.toString(this._host)},set:function(t){this._lineSpacing.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"outlineWidth",{get:function(){return this._outlineWidth},set:function(t){this._outlineWidth!==t&&(this._outlineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"outlineColor",{get:function(){return this._outlineColor},set:function(t){this._outlineColor!==t&&(this._outlineColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"TextBlock"},e.prototype._drawText=function(t,e,i,r){var o=this._currentMeasure.width,n=0;switch(this._textHorizontalAlignment){case a.Control.HORIZONTAL_ALIGNMENT_LEFT:n=0;break;case a.Control.HORIZONTAL_ALIGNMENT_RIGHT:n=o-e;break;case a.Control.HORIZONTAL_ALIGNMENT_CENTER:n=(o-e)/2}(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(r.shadowColor=this.shadowColor,r.shadowBlur=this.shadowBlur,r.shadowOffsetX=this.shadowOffsetX,r.shadowOffsetY=this.shadowOffsetY),this.outlineWidth&&r.strokeText(t,this._currentMeasure.left+n,i),r.fillText(t,this._currentMeasure.left+n,i)},e.prototype._draw=function(t,e){e.save(),this._applyStates(e),this._processMeasures(t,e)&&this._renderLines(e),e.restore()},e.prototype._applyStates=function(e){t.prototype._applyStates.call(this,e),this.outlineWidth&&(e.lineWidth=this.outlineWidth,e.strokeStyle=this.outlineColor)},e.prototype._additionalProcessing=function(t,e){this._lines=this._breakLines(this._currentMeasure.width,e),this.onLinesReadyObservable.notifyObservers(this)},e.prototype._breakLines=function(t,e){var i=[],r=this.text.split("\n");if(this._textWrapping!==o.Ellipsis||this._resizeToFit)if(this._textWrapping!==o.WordWrap||this._resizeToFit)for(var n=0,s=r;n<s.length;n++){l=s[n];i.push(this._parseLine(l,e))}else for(var a=0,h=r;a<h.length;a++){var l=h[a];i.push.apply(i,this._parseLineWordWrap(l,t,e))}else for(var u=0,c=r;u<c.length;u++){var l=c[u];i.push(this._parseLineEllipsis(l,t,e))}return i},e.prototype._parseLine=function(t,e){return void 0===t&&(t=""),{text:t,width:e.measureText(t).width}},e.prototype._parseLineEllipsis=function(t,e,i){void 0===t&&(t="");var r=i.measureText(t).width;for(r>e&&(t+="…");t.length>2&&r>e;)t=t.slice(0,-2)+"…",r=i.measureText(t).width;return{text:t,width:r}},e.prototype._parseLineWordWrap=function(t,e,i){void 0===t&&(t="");for(var r=[],o=t.split(" "),n=0,s=0;s<o.length;s++){var a=s>0?t+" "+o[s]:o[0],h=i.measureText(a).width;h>e&&s>0?(r.push({text:t,width:n}),t=o[s],n=i.measureText(t).width):(n=h,t=a)}return r.push({text:t,width:n}),r},e.prototype._renderLines=function(t){var e=this._currentMeasure.height;this._fontOffset||(this._fontOffset=a.Control._GetFontOffset(t.font));var i=0;switch(this._textVerticalAlignment){case a.Control.VERTICAL_ALIGNMENT_TOP:i=this._fontOffset.ascent;break;case a.Control.VERTICAL_ALIGNMENT_BOTTOM:i=e-this._fontOffset.height*(this._lines.length-1)-this._fontOffset.descent;break;case a.Control.VERTICAL_ALIGNMENT_CENTER:i=this._fontOffset.ascent+(e-this._fontOffset.height*this._lines.length)/2}i+=this._currentMeasure.top;for(var r=0,o=0;o<this._lines.length;o++){var n=this._lines[o];0!==o&&0!==this._lineSpacing.internalValue&&(this._lineSpacing.isPixel?i+=this._lineSpacing.getValue(this._host):i+=this._lineSpacing.getValue(this._host)*this._height.getValueInPixel(this._host,this._cachedParentMeasure.height)),this._drawText(n.text,n.width,i,t),i+=this._fontOffset.height,n.width>r&&(r=n.width)}this._resizeToFit&&(this.width=this.paddingLeftInPixels+this.paddingRightInPixels+r+"px",this.height=this.paddingTopInPixels+this.paddingBottomInPixels+this._fontOffset.height*this._lines.length+"px")},e.prototype.computeExpectedHeight=function(){if(this.text&&this.widthInPixels){var t=document.createElement("canvas").getContext("2d");if(t){this._applyStates(t),this._fontOffset||(this._fontOffset=a.Control._GetFontOffset(t.font));var e=this._lines?this._lines:this._breakLines(this.widthInPixels-this.paddingLeftInPixels-this.paddingRightInPixels,t);return this.paddingTopInPixels+this.paddingBottomInPixels+this._fontOffset.height*e.length}}return 0},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.onTextChangedObservable.clear()},e}(a.Control);e.TextBlock=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(7),s=i(1),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isVertical=!0,i._manualWidth=!1,i._manualHeight=!1,i._doNotTrackManualChanges=!1,i._tempMeasureStore=n.Measure.Empty(),i}return r(e,t),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){this._isVertical!==t&&(this._isVertical=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._doNotTrackManualChanges||(this._manualWidth=!0),this._width.toString(this._host)!==t&&this._width.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"height",{get:function(){return this._height.toString(this._host)},set:function(t){this._doNotTrackManualChanges||(this._manualHeight=!0),this._height.toString(this._host)!==t&&this._height.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"StackPanel"},e.prototype._preMeasure=function(e,i){for(var r=0,o=0,n=0,a=this._children;n<a.length;n++){var h=a[n];this._tempMeasureStore.copyFrom(h._currentMeasure),h._currentMeasure.copyFrom(e),h._measure(),this._isVertical?(h.top=o+"px",h._top.ignoreAdaptiveScaling||h._markAsDirty(),h._top.ignoreAdaptiveScaling=!0,o+=h._currentMeasure.height,h._currentMeasure.width>r&&(r=h._currentMeasure.width),h.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP):(h.left=r+"px",h._left.ignoreAdaptiveScaling||h._markAsDirty(),h._left.ignoreAdaptiveScaling=!0,r+=h._currentMeasure.width,h._currentMeasure.height>o&&(o=h._currentMeasure.height),h.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT),h._currentMeasure.copyFrom(this._tempMeasureStore)}this._doNotTrackManualChanges=!0;var l,u,c=this.height,_=this.width;this._manualHeight||(this.height=o+"px"),this._manualWidth||(this.width=r+"px"),l=_!==this.width||!this._width.ignoreAdaptiveScaling,(u=c!==this.height||!this._height.ignoreAdaptiveScaling)&&(this._height.ignoreAdaptiveScaling=!0),l&&(this._width.ignoreAdaptiveScaling=!0),this._doNotTrackManualChanges=!1,(l||u)&&this._markAllAsDirty(),t.prototype._preMeasure.call(this,e,i)},e}(o.Container);e.StackPanel=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=function(){function t(t,e,i,r){this.left=t,this.top=e,this.width=i,this.height=r}return t.prototype.copyFrom=function(t){this.left=t.left,this.top=t.top,this.width=t.width,this.height=t.height},t.prototype.isEqualsTo=function(t){return this.left===t.left&&(this.top===t.top&&(this.width===t.width&&this.height===t.height))},t.Empty=function(){return new t(0,0,0,0)},t}();e.Measure=r},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(3),n=i(0),s=function(t){function e(){var e=t.call(this)||this;return e._columns=10,e._rows=0,e._rowThenColum=!0,e._orientation=o.Container3D.FACEORIGIN_ORIENTATION,e.margin=0,e}return r(e,t),Object.defineProperty(e.prototype,"orientation",{get:function(){return this._orientation},set:function(t){var e=this;this._orientation!==t&&(this._orientation=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"columns",{get:function(){return this._columns},set:function(t){var e=this;this._columns!==t&&(this._columns=t,this._rowThenColum=!0,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"rows",{get:function(){return this._rows},set:function(t){var e=this;this._rows!==t&&(this._rows=t,this._rowThenColum=!1,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._arrangeChildren=function(){this._cellWidth=0,this._cellHeight=0;for(var t=0,e=0,i=0,r=n.Matrix.Invert(this.node.computeWorldMatrix(!0)),o=0,s=this._children;o<s.length;o++){if((b=s[o]).mesh){i++,b.mesh.computeWorldMatrix(!0);var a=b.mesh.getHierarchyBoundingVectors(),h=n.Tmp.Vector3[0],l=n.Tmp.Vector3[1];a.max.subtractToRef(a.min,l),l.scaleInPlace(.5),n.Vector3.TransformNormalToRef(l,r,h),this._cellWidth=Math.max(this._cellWidth,2*h.x),this._cellHeight=Math.max(this._cellHeight,2*h.y)}}this._cellWidth+=2*this.margin,this._cellHeight+=2*this.margin,this._rowThenColum?(e=this._columns,t=Math.ceil(i/this._columns)):(t=this._rows,e=Math.ceil(i/this._rows));var u=.5*e*this._cellWidth,c=.5*t*this._cellHeight,_=[],f=0;if(this._rowThenColum)for(var p=0;p<t;p++)for(var d=0;d<e&&(_.push(new n.Vector3(d*this._cellWidth-u+this._cellWidth/2,p*this._cellHeight-c+this._cellHeight/2,0)),!(++f>i));d++);else for(d=0;d<e;d++)for(p=0;p<t&&(_.push(new n.Vector3(d*this._cellWidth-u+this._cellWidth/2,p*this._cellHeight-c+this._cellHeight/2,0)),!(++f>i));p++);f=0;for(var y=0,g=this._children;y<g.length;y++){var b;(b=g[y]).mesh&&(this._mapGridNode(b,_[f]),f++)}this._finalProcessing()},e.prototype._finalProcessing=function(){},e}(o.Container3D);e.VolumeBasedPanel=s},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(16)),r(i(18)),r(i(30)),r(i(4)),r(i(1)),r(i(31)),r(i(32)),r(i(11)),r(i(19)),r(i(33)),r(i(34)),r(i(35)),r(i(21)),r(i(6)),r(i(36)),r(i(5)),r(i(37)),r(i(22)),r(i(10)),r(i(38)),r(i(39))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thickness=1,i._cornerRadius=0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cornerRadius",{get:function(){return this._cornerRadius},set:function(t){t<0&&(t=0),this._cornerRadius!==t&&(this._cornerRadius=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Rectangle"},e.prototype._localDraw=function(t){t.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),this._background&&(t.fillStyle=this._background,this._cornerRadius?(this._drawRoundedRect(t,this._thickness/2),t.fill()):t.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)),this._thickness&&((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0),this.color&&(t.strokeStyle=this.color),t.lineWidth=this._thickness,this._cornerRadius?(this._drawRoundedRect(t,this._thickness/2),t.stroke()):t.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,this._currentMeasure.width-this._thickness,this._currentMeasure.height-this._thickness)),t.restore()},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.width-=2*this._thickness,this._measureForChildren.height-=2*this._thickness,this._measureForChildren.left+=this._thickness,this._measureForChildren.top+=this._thickness},e.prototype._drawRoundedRect=function(t,e){void 0===e&&(e=0);var i=this._currentMeasure.left+e,r=this._currentMeasure.top+e,o=this._currentMeasure.width-2*e,n=this._currentMeasure.height-2*e,s=Math.min(n/2-2,Math.min(o/2-2,this._cornerRadius));t.beginPath(),t.moveTo(i+s,r),t.lineTo(i+o-s,r),t.quadraticCurveTo(i+o,r,i+o,r+s),t.lineTo(i+o,r+n-s),t.quadraticCurveTo(i+o,r+n,i+o-s,r+n),t.lineTo(i+s,r+n),t.quadraticCurveTo(i,r+n,i,r+n-s),t.lineTo(i,r+s),t.quadraticCurveTo(i,r,i+s,r),t.closePath()},e.prototype._clipForChildren=function(t){this._cornerRadius&&(this._drawRoundedRect(t,this._thickness),t.clip())},e}(i(4).Container);e.Rectangle=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=function(t){function e(i,r){void 0===r&&(r=null);var o=t.call(this,i)||this;return o.name=i,o._loaded=!1,o._stretch=e.STRETCH_FILL,o._autoScale=!1,o._sourceLeft=0,o._sourceTop=0,o._sourceWidth=0,o._sourceHeight=0,o._cellWidth=0,o._cellHeight=0,o._cellId=-1,o.source=r,o}return r(e,t),Object.defineProperty(e.prototype,"sourceLeft",{get:function(){return this._sourceLeft},set:function(t){this._sourceLeft!==t&&(this._sourceLeft=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceTop",{get:function(){return this._sourceTop},set:function(t){this._sourceTop!==t&&(this._sourceTop=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceWidth",{get:function(){return this._sourceWidth},set:function(t){this._sourceWidth!==t&&(this._sourceWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"sourceHeight",{get:function(){return this._sourceHeight},set:function(t){this._sourceHeight!==t&&(this._sourceHeight=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"autoScale",{get:function(){return this._autoScale},set:function(t){this._autoScale!==t&&(this._autoScale=t,t&&this._loaded&&this.synchronizeSizeWithContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"stretch",{get:function(){return this._stretch},set:function(t){this._stretch!==t&&(this._stretch=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"domImage",{get:function(){return this._domImage},set:function(t){var e=this;this._domImage=t,this._loaded=!1,this._domImage.width?this._onImageLoaded():this._domImage.onload=function(){e._onImageLoaded()}},enumerable:!0,configurable:!0}),e.prototype._onImageLoaded=function(){this._imageWidth=this._domImage.width,this._imageHeight=this._domImage.height,this._loaded=!0,this._autoScale&&this.synchronizeSizeWithContent(),this._markAsDirty()},Object.defineProperty(e.prototype,"source",{set:function(t){var e=this;this._source!==t&&(this._loaded=!1,this._source=t,this._domImage=document.createElement("img"),this._domImage.onload=function(){e._onImageLoaded()},t&&(n.Tools.SetCorsBehavior(t,this._domImage),this._domImage.src=t))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellWidth",{get:function(){return this._cellWidth},set:function(t){this._cellWidth!==t&&(this._cellWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellHeight",{get:function(){return this._cellHeight},set:function(t){this._cellHeight!==t&&(this._cellHeight=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellId",{get:function(){return this._cellId},set:function(t){this._cellId!==t&&(this._cellId=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Image"},e.prototype.synchronizeSizeWithContent=function(){this._loaded&&(this.width=this._domImage.width+"px",this.height=this._domImage.height+"px")},e.prototype._draw=function(t,i){var r,o,n,s;if(i.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(i.shadowColor=this.shadowColor,i.shadowBlur=this.shadowBlur,i.shadowOffsetX=this.shadowOffsetX,i.shadowOffsetY=this.shadowOffsetY),-1==this.cellId)r=this._sourceLeft,o=this._sourceTop,n=this._sourceWidth?this._sourceWidth:this._imageWidth,s=this._sourceHeight?this._sourceHeight:this._imageHeight;else{var a=this._domImage.naturalWidth/this.cellWidth,h=this.cellId/a>>0,l=this.cellId%a;r=this.cellWidth*l,o=this.cellHeight*h,n=this.cellWidth,s=this.cellHeight}if(this._applyStates(i),this._processMeasures(t,i)&&this._loaded)switch(this._stretch){case e.STRETCH_NONE:case e.STRETCH_FILL:i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height);break;case e.STRETCH_UNIFORM:var u=this._currentMeasure.width/n,c=this._currentMeasure.height/s,_=Math.min(u,c),f=(this._currentMeasure.width-n*_)/2,p=(this._currentMeasure.height-s*_)/2;i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left+f,this._currentMeasure.top+p,n*_,s*_);break;case e.STRETCH_EXTEND:i.drawImage(this._domImage,r,o,n,s,this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height),this._autoScale&&this.synchronizeSizeWithContent(),this._root&&this._root.parent&&(this._root.width=this.width,this._root.height=this.height)}i.restore()},e.STRETCH_NONE=0,e.STRETCH_FILL=1,e.STRETCH_UNIFORM=2,e.STRETCH_EXTEND=3,e}(o.Control);e.Image=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=i(4),s=i(23),a=i(7),h=function(t){function e(e,i,r,s,a,h){void 0===i&&(i=0),void 0===r&&(r=0),void 0===a&&(a=!1),void 0===h&&(h=o.Texture.NEAREST_SAMPLINGMODE);var l=t.call(this,e,{width:i,height:r},s,a,h,o.Engine.TEXTUREFORMAT_RGBA)||this;return l._isDirty=!1,l._rootContainer=new n.Container("root"),l._lastControlOver={},l._lastControlDown={},l._capturingControl={},l._linkedControls=new Array,l._isFullscreen=!1,l._fullscreenViewport=new o.Viewport(0,0,1,1),l._idealWidth=0,l._idealHeight=0,l._useSmallestIdeal=!1,l._renderAtIdealSize=!1,l._blockNextFocusCheck=!1,l._renderScale=1,l.premulAlpha=!1,(s=l.getScene())&&l._texture?(l._rootCanvas=s.getEngine().getRenderingCanvas(),l._renderObserver=s.onBeforeCameraRenderObservable.add(function(t){return l._checkUpdate(t)}),l._preKeyboardObserver=s.onPreKeyboardObservable.add(function(t){l._focusedControl&&(t.type===o.KeyboardEventTypes.KEYDOWN&&l._focusedControl.processKeyboard(t.event),t.skipOnPointerObservable=!0)}),l._rootContainer._link(null,l),l.hasAlpha=!0,i&&r||(l._resizeObserver=s.getEngine().onResizeObservable.add(function(){return l._onResize()}),l._onResize()),l._texture.isReady=!0,l):l}return r(e,t),Object.defineProperty(e.prototype,"renderScale",{get:function(){return this._renderScale},set:function(t){t!==this._renderScale&&(this._renderScale=t,this._onResize())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this.markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"idealWidth",{get:function(){return this._idealWidth},set:function(t){this._idealWidth!==t&&(this._idealWidth=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"idealHeight",{get:function(){return this._idealHeight},set:function(t){this._idealHeight!==t&&(this._idealHeight=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"useSmallestIdeal",{get:function(){return this._useSmallestIdeal},set:function(t){this._useSmallestIdeal!==t&&(this._useSmallestIdeal=t,this.markAsDirty(),this._rootContainer._markAllAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"renderAtIdealSize",{get:function(){return this._renderAtIdealSize},set:function(t){this._renderAtIdealSize!==t&&(this._renderAtIdealSize=t,this._onResize())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"layer",{get:function(){return this._layerToDispose},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"rootContainer",{get:function(){return this._rootContainer},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"focusedControl",{get:function(){return this._focusedControl},set:function(t){this._focusedControl!=t&&(this._focusedControl&&this._focusedControl.onBlur(),t&&t.onFocus(),this._focusedControl=t)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isForeground",{get:function(){return!this.layer||!this.layer.isBackground},set:function(t){this.layer&&this.layer.isBackground!==!t&&(this.layer.isBackground=!t)},enumerable:!0,configurable:!0}),e.prototype.executeOnAllControls=function(t,e){e||(e=this._rootContainer),t(e);for(var i=0,r=e.children;i<r.length;i++){var o=r[i];o.children?this.executeOnAllControls(t,o):t(o)}},e.prototype.markAsDirty=function(){this._isDirty=!0},e.prototype.createStyle=function(){return new s.Style(this)},e.prototype.addControl=function(t){return this._rootContainer.addControl(t),this},e.prototype.removeControl=function(t){return this._rootContainer.removeControl(t),this},e.prototype.dispose=function(){var e=this.getScene();e&&(this._rootCanvas=null,e.onBeforeCameraRenderObservable.remove(this._renderObserver),this._resizeObserver&&e.getEngine().onResizeObservable.remove(this._resizeObserver),this._pointerMoveObserver&&e.onPrePointerObservable.remove(this._pointerMoveObserver),this._pointerObserver&&e.onPointerObservable.remove(this._pointerObserver),this._preKeyboardObserver&&e.onPreKeyboardObservable.remove(this._preKeyboardObserver),this._canvasPointerOutObserver&&e.getEngine().onCanvasPointerOutObservable.remove(this._canvasPointerOutObserver),this._layerToDispose&&(this._layerToDispose.texture=null,this._layerToDispose.dispose(),this._layerToDispose=null),this._rootContainer.dispose(),t.prototype.dispose.call(this))},e.prototype._onResize=function(){var t=this.getScene();if(t){var e=t.getEngine(),i=this.getSize(),r=e.getRenderWidth()*this._renderScale,o=e.getRenderHeight()*this._renderScale;this._renderAtIdealSize&&(this._idealWidth?(o=o*this._idealWidth/r,r=this._idealWidth):this._idealHeight&&(r=r*this._idealHeight/o,o=this._idealHeight)),i.width===r&&i.height===o||(this.scaleTo(r,o),this.markAsDirty(),(this._idealWidth||this._idealHeight)&&this._rootContainer._markAllAsDirty())}},e.prototype._getGlobalViewport=function(t){var e=t.getEngine();return this._fullscreenViewport.toGlobal(e.getRenderWidth(),e.getRenderHeight())},e.prototype.getProjectedPosition=function(t,e){var i=this.getScene();if(!i)return o.Vector2.Zero();var r=this._getGlobalViewport(i),n=o.Vector3.Project(t,e,i.getTransformMatrix(),r);return n.scaleInPlace(this.renderScale),new o.Vector2(n.x,n.y)},e.prototype._checkUpdate=function(t){if(!this._layerToDispose||0!=(t.layerMask&this._layerToDispose.layerMask)){if(this._isFullscreen&&this._linkedControls.length){var e=this.getScene();if(!e)return;for(var i=this._getGlobalViewport(e),r=0,n=this._linkedControls;r<n.length;r++){var s=n[r];if(s.isVisible){var a=s._linkedMesh;if(a&&!a.isDisposed()){var h=a.getBoundingInfo().boundingSphere.center,l=o.Vector3.Project(h,a.getWorldMatrix(),e.getTransformMatrix(),i);l.z<0||l.z>1?s.notRenderable=!0:(s.notRenderable=!1,l.scaleInPlace(this.renderScale),s._moveToProjectedPosition(l))}else o.Tools.SetImmediate(function(){s.linkWithMesh(null)})}}}(this._isDirty||this._rootContainer.isDirty)&&(this._isDirty=!1,this._render(),this.update(!0,this.premulAlpha))}},e.prototype._render=function(){var t=this.getSize(),e=t.width,i=t.height,r=this.getContext();r.clearRect(0,0,e,i),this._background&&(r.save(),r.fillStyle=this._background,r.fillRect(0,0,e,i),r.restore()),r.font="18px Arial",r.strokeStyle="white";var o=new a.Measure(0,0,e,i);this._rootContainer._draw(o,r)},e.prototype._changeCursor=function(t){this._rootCanvas&&(this._rootCanvas.style.cursor=t)},e.prototype._doPicking=function(t,e,i,r,n){var s=this.getScene();if(s){var a=s.getEngine(),h=this.getSize();this._isFullscreen&&(t*=h.width/a.getRenderWidth(),e*=h.height/a.getRenderHeight()),this._capturingControl[r]?this._capturingControl[r]._processObservables(i,t,e,r,n):(this._rootContainer._processPicking(t,e,i,r,n)||(this._changeCursor(""),i===o.PointerEventTypes.POINTERMOVE&&(this._lastControlOver[r]&&this._lastControlOver[r]._onPointerOut(this._lastControlOver[r]),delete this._lastControlOver[r])),this._manageFocus())}},e.prototype._cleanControlAfterRemovalFromList=function(t,e){for(var i in t){if(t.hasOwnProperty(i))t[i]===e&&delete t[i]}},e.prototype._cleanControlAfterRemoval=function(t){this._cleanControlAfterRemovalFromList(this._lastControlDown,t),this._cleanControlAfterRemovalFromList(this._lastControlOver,t)},e.prototype.attach=function(){var t=this,e=this.getScene();e&&(this._pointerMoveObserver=e.onPrePointerObservable.add(function(i,r){if(!e.isPointerCaptured(i.event.pointerId)&&(i.type===o.PointerEventTypes.POINTERMOVE||i.type===o.PointerEventTypes.POINTERUP||i.type===o.PointerEventTypes.POINTERDOWN)&&e){var n=e.cameraToUseForPointers||e.activeCamera;if(n){var s=e.getEngine(),a=n.viewport,h=(e.pointerX/s.getHardwareScalingLevel()-a.x*s.getRenderWidth())/a.width,l=(e.pointerY/s.getHardwareScalingLevel()-a.y*s.getRenderHeight())/a.height;t._shouldBlockPointer=!1,t._doPicking(h,l,i.type,i.event.pointerId||0,i.event.button),t._shouldBlockPointer&&(i.skipOnPointerObservable=t._shouldBlockPointer)}}}),this._attachToOnPointerOut(e))},e.prototype.attachToMesh=function(t,e){var i=this;void 0===e&&(e=!0);var r=this.getScene();r&&(this._pointerObserver=r.onPointerObservable.add(function(e,r){if(e.type===o.PointerEventTypes.POINTERMOVE||e.type===o.PointerEventTypes.POINTERUP||e.type===o.PointerEventTypes.POINTERDOWN){var n=e.event.pointerId||0;if(e.pickInfo&&e.pickInfo.hit&&e.pickInfo.pickedMesh===t){var s=e.pickInfo.getTextureCoordinates();if(s){var a=i.getSize();i._doPicking(s.x*a.width,(1-s.y)*a.height,e.type,n,e.event.button)}}else if(e.type===o.PointerEventTypes.POINTERUP){if(i._lastControlDown[n]&&i._lastControlDown[n]._forcePointerUp(n),delete i._lastControlDown[n],i.focusedControl){var h=i.focusedControl.keepsFocusWith(),l=!0;if(h)for(var u=0,c=h;u<c.length;u++){var _=c[u];if(i!==_._host){var f=_._host;if(f._lastControlOver[n]&&f._lastControlOver[n].isAscendant(_)){l=!1;break}}}l&&(i.focusedControl=null)}}else e.type===o.PointerEventTypes.POINTERMOVE&&(i._lastControlOver[n]&&i._lastControlOver[n]._onPointerOut(i._lastControlOver[n]),delete i._lastControlOver[n])}}),t.enablePointerMoveEvents=e,this._attachToOnPointerOut(r))},e.prototype.moveFocusToControl=function(t){this.focusedControl=t,this._lastPickedControl=t,this._blockNextFocusCheck=!0},e.prototype._manageFocus=function(){if(this._blockNextFocusCheck)return this._blockNextFocusCheck=!1,void(this._lastPickedControl=this._focusedControl);if(this._focusedControl&&this._focusedControl!==this._lastPickedControl){if(this._lastPickedControl.isFocusInvisible)return;this.focusedControl=null}},e.prototype._attachToOnPointerOut=function(t){var e=this;this._canvasPointerOutObserver=t.getEngine().onCanvasPointerOutObservable.add(function(t){e._lastControlOver[t.pointerId]&&e._lastControlOver[t.pointerId]._onPointerOut(e._lastControlOver[t.pointerId]),delete e._lastControlOver[t.pointerId],e._lastControlDown[t.pointerId]&&e._lastControlDown[t.pointerId]._forcePointerUp(),delete e._lastControlDown[t.pointerId]})},e.CreateForMesh=function(t,i,r,n,s){void 0===i&&(i=1024),void 0===r&&(r=1024),void 0===n&&(n=!0),void 0===s&&(s=!1);var a=new e(t.name+" AdvancedDynamicTexture",i,r,t.getScene(),!0,o.Texture.TRILINEAR_SAMPLINGMODE),h=new o.StandardMaterial("AdvancedDynamicTextureMaterial",t.getScene());return h.backFaceCulling=!1,h.diffuseColor=o.Color3.Black(),h.specularColor=o.Color3.Black(),s?(h.diffuseTexture=a,h.emissiveTexture=a,a.hasAlpha=!0):(h.emissiveTexture=a,h.opacityTexture=a),t.material=h,a.attachToMesh(t,n),a},e.CreateFullscreenUI=function(t,i,r,n){void 0===i&&(i=!0),void 0===r&&(r=null),void 0===n&&(n=o.Texture.BILINEAR_SAMPLINGMODE);var s=new e(t,0,0,r,!1,n),a=new o.Layer(t+"_layer",null,r,!i);return a.texture=s,s._layerToDispose=a,s._isFullscreen=!0,s.attach(),s},e}(o.DynamicTexture);e.AdvancedDynamicTexture=h},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(25),n=function(){function t(t){this.name=t,this._downCount=0,this._enterCount=-1,this._downPointerIds={},this._isVisible=!0,this.onPointerMoveObservable=new r.Observable,this.onPointerOutObservable=new r.Observable,this.onPointerDownObservable=new r.Observable,this.onPointerUpObservable=new r.Observable,this.onPointerClickObservable=new r.Observable,this.onPointerEnterObservable=new r.Observable,this._behaviors=new Array}return Object.defineProperty(t.prototype,"position",{get:function(){return this._node?this._node.position:r.Vector3.Zero()},set:function(t){this._node&&(this._node.position=t)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"scaling",{get:function(){return this._node?this._node.scaling:new r.Vector3(1,1,1)},set:function(t){this._node&&(this._node.scaling=t)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"behaviors",{get:function(){return this._behaviors},enumerable:!0,configurable:!0}),t.prototype.addBehavior=function(t){var e=this;if(-1!==this._behaviors.indexOf(t))return this;t.init();var i=this._host.scene;return i.isLoading?i.onDataLoadedObservable.addOnce(function(){t.attach(e)}):t.attach(this),this._behaviors.push(t),this},t.prototype.removeBehavior=function(t){var e=this._behaviors.indexOf(t);return-1===e?this:(this._behaviors[e].detach(),this._behaviors.splice(e,1),this)},t.prototype.getBehaviorByName=function(t){for(var e=0,i=this._behaviors;e<i.length;e++){var r=i[e];if(r.name===t)return r}return null},Object.defineProperty(t.prototype,"isVisible",{get:function(){return this._isVisible},set:function(t){if(this._isVisible!==t){this._isVisible=t;var e=this.mesh;e&&e.setEnabled(t)}},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"typeName",{get:function(){return this._getTypeName()},enumerable:!0,configurable:!0}),t.prototype._getTypeName=function(){return"Control3D"},Object.defineProperty(t.prototype,"node",{get:function(){return this._node},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"mesh",{get:function(){return this._node instanceof r.AbstractMesh?this._node:null},enumerable:!0,configurable:!0}),t.prototype.linkToTransformNode=function(t){return this._node&&(this._node.parent=t),this},t.prototype._prepareNode=function(t){if(!this._node){if(this._node=this._createNode(t),!this.node)return;this._node.metadata=this,this._node.position=this.position,this._node.scaling=this.scaling;var e=this.mesh;e&&(e.isPickable=!0,this._affectMaterial(e))}},t.prototype._createNode=function(t){return null},t.prototype._affectMaterial=function(t){t.material=null},t.prototype._onPointerMove=function(t,e){this.onPointerMoveObservable.notifyObservers(e,-1,t,this)},t.prototype._onPointerEnter=function(t){return!(this._enterCount>0)&&(-1===this._enterCount&&(this._enterCount=0),this._enterCount++,this.onPointerEnterObservable.notifyObservers(this,-1,t,this),this.pointerEnterAnimation&&this.pointerEnterAnimation(),!0)},t.prototype._onPointerOut=function(t){this._enterCount=0,this.onPointerOutObservable.notifyObservers(this,-1,t,this),this.pointerOutAnimation&&this.pointerOutAnimation()},t.prototype._onPointerDown=function(t,e,i,r){return 0===this._downCount&&(this._downCount++,this._downPointerIds[i]=!0,this.onPointerDownObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.pointerDownAnimation&&this.pointerDownAnimation(),!0)},t.prototype._onPointerUp=function(t,e,i,r,n){this._downCount=0,delete this._downPointerIds[i],n&&(this._enterCount>0||-1===this._enterCount)&&this.onPointerClickObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.onPointerUpObservable.notifyObservers(new o.Vector3WithInfo(e,r),-1,t,this),this.pointerUpAnimation&&this.pointerUpAnimation()},t.prototype.forcePointerUp=function(t){if(void 0===t&&(t=null),null!==t)this._onPointerUp(this,r.Vector3.Zero(),t,0,!0);else for(var e in this._downPointerIds)this._onPointerUp(this,r.Vector3.Zero(),+e,0,!0)},t.prototype._processObservables=function(t,e,i,o){if(t===r.PointerEventTypes.POINTERMOVE){this._onPointerMove(this,e);var n=this._host._lastControlOver[i];return n&&n!==this&&n._onPointerOut(this),n!==this&&this._onPointerEnter(this),this._host._lastControlOver[i]=this,!0}return t===r.PointerEventTypes.POINTERDOWN?(this._onPointerDown(this,e,i,o),this._host._lastControlDown[i]=this,this._host._lastPickedControl=this,!0):t===r.PointerEventTypes.POINTERUP&&(this._host._lastControlDown[i]&&this._host._lastControlDown[i]._onPointerUp(this,e,i,o,!0),delete this._host._lastControlDown[i],!0)},t.prototype._disposeNode=function(){this._node&&(this._node.dispose(),this._node=null)},t.prototype.dispose=function(){this.onPointerDownObservable.clear(),this.onPointerEnterObservable.clear(),this.onPointerMoveObservable.clear(),this.onPointerOutObservable.clear(),this.onPointerUpObservable.clear(),this.onPointerClickObservable.clear(),this._disposeNode();for(var t=0,e=this._behaviors;t<e.length;t++){e[t].detach()}},t}();e.Control3D=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(24),n=i(0),s=i(12),a=function(t){function e(e){var i=t.call(this,e)||this;return i._contentResolution=512,i._contentScaleRatio=2,i.pointerEnterAnimation=function(){i.mesh&&(i._currentMaterial.emissiveColor=n.Color3.Red())},i.pointerOutAnimation=function(){i._currentMaterial.emissiveColor=n.Color3.Black()},i.pointerDownAnimation=function(){i.mesh&&i.mesh.scaling.scaleInPlace(.95)},i.pointerUpAnimation=function(){i.mesh&&i.mesh.scaling.scaleInPlace(1/.95)},i}return r(e,t),Object.defineProperty(e.prototype,"contentResolution",{get:function(){return this._contentResolution},set:function(t){this._contentResolution!==t&&(this._contentResolution=t,this._resetContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"contentScaleRatio",{get:function(){return this._contentScaleRatio},set:function(t){this._contentScaleRatio!==t&&(this._contentScaleRatio=t,this._resetContent())},enumerable:!0,configurable:!0}),e.prototype._disposeFacadeTexture=function(){this._facadeTexture&&(this._facadeTexture.dispose(),this._facadeTexture=null)},e.prototype._resetContent=function(){this._disposeFacadeTexture(),this.content=this._content},Object.defineProperty(e.prototype,"content",{get:function(){return this._content},set:function(t){this._content=t,this._host&&this._host.utilityLayer&&(this._facadeTexture||(this._facadeTexture=new s.AdvancedDynamicTexture("Facade",this._contentResolution,this._contentResolution,this._host.utilityLayer.utilityLayerScene,!0,n.Texture.TRILINEAR_SAMPLINGMODE),this._facadeTexture.rootContainer.scaleX=this._contentScaleRatio,this._facadeTexture.rootContainer.scaleY=this._contentScaleRatio,this._facadeTexture.premulAlpha=!0),this._facadeTexture.addControl(t),this._applyFacade(this._facadeTexture))},enumerable:!0,configurable:!0}),e.prototype._applyFacade=function(t){this._currentMaterial.emissiveTexture=t},e.prototype._getTypeName=function(){return"Button3D"},e.prototype._createNode=function(t){for(var e=new Array(6),i=0;i<6;i++)e[i]=new n.Vector4(0,0,0,0);return e[1]=new n.Vector4(0,0,1,1),n.MeshBuilder.CreateBox(this.name+"_rootMesh",{width:1,height:1,depth:.08,faceUV:e},t)},e.prototype._affectMaterial=function(t){var e=new n.StandardMaterial(this.name+"Material",t.getScene());e.specularColor=n.Color3.Black(),t.material=e,this._currentMaterial=e,this._resetContent()},e.prototype.dispose=function(){t.prototype.dispose.call(this),this._disposeFacadeTexture(),this._currentMaterial&&this._currentMaterial.dispose()},e}(o.AbstractButton3D);e.Button3D=a},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(29)),r(i(40))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(10),n=i(1),s=i(5),a=i(11),h=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i.thickness=1,i.isPointerBlocker=!0,i.pointerEnterAnimation=function(){i.alpha-=.1},i.pointerOutAnimation=function(){i.alpha+=.1},i.pointerDownAnimation=function(){i.scaleX-=.05,i.scaleY-=.05},i.pointerUpAnimation=function(){i.scaleX+=.05,i.scaleY+=.05},i}return r(e,t),e.prototype._getTypeName=function(){return"Button"},e.prototype._processPicking=function(e,i,r,o,n){return!(!this.isHitTestVisible||!this.isVisible||this.notRenderable)&&(!!t.prototype.contains.call(this,e,i)&&(this._processObservables(r,e,i,o,n),!0))},e.prototype._onPointerEnter=function(e){return!!t.prototype._onPointerEnter.call(this,e)&&(this.pointerEnterAnimation&&this.pointerEnterAnimation(),!0)},e.prototype._onPointerOut=function(e){this.pointerOutAnimation&&this.pointerOutAnimation(),t.prototype._onPointerOut.call(this,e)},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.pointerDownAnimation&&this.pointerDownAnimation(),!0)},e.prototype._onPointerUp=function(e,i,r,o,n){this.pointerUpAnimation&&this.pointerUpAnimation(),t.prototype._onPointerUp.call(this,e,i,r,o,n)},e.CreateImageButton=function(t,i,r){var o=new e(t),h=new s.TextBlock(t+"_button",i);h.textWrapping=!0,h.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,h.paddingLeft="20%",o.addControl(h);var l=new a.Image(t+"_icon",r);return l.width="20%",l.stretch=a.Image.STRETCH_UNIFORM,l.horizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_LEFT,o.addControl(l),o},e.CreateImageOnlyButton=function(t,i){var r=new e(t),o=new a.Image(t+"_icon",i);return o.stretch=a.Image.STRETCH_FILL,o.horizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_LEFT,r.addControl(o),r},e.CreateSimpleButton=function(t,i){var r=new e(t),o=new s.TextBlock(t+"_button",i);return o.textWrapping=!0,o.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,r.addControl(o),r},e.CreateImageWithCenterTextButton=function(t,i,r){var o=new e(t),h=new a.Image(t+"_icon",r);h.stretch=a.Image.STRETCH_FILL,o.addControl(h);var l=new s.TextBlock(t+"_button",i);return l.textWrapping=!0,l.textHorizontalAlignment=n.Control.HORIZONTAL_ALIGNMENT_CENTER,o.addControl(l),o},e}(o.Rectangle);e.Button=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=function(t){function e(e,i){void 0===i&&(i=0);var r=t.call(this,e.x,e.y)||this;return r.buttonIndex=i,r}return r(e,t),e}(o.Vector2);e.Vector2WithInfo=n;var s=function(){function t(t,e,i,r,o,n){this.m=new Float32Array(6),this.fromValues(t,e,i,r,o,n)}return t.prototype.fromValues=function(t,e,i,r,o,n){return this.m[0]=t,this.m[1]=e,this.m[2]=i,this.m[3]=r,this.m[4]=o,this.m[5]=n,this},t.prototype.determinant=function(){return this.m[0]*this.m[3]-this.m[1]*this.m[2]},t.prototype.invertToRef=function(t){var e=this.m[0],i=this.m[1],r=this.m[2],n=this.m[3],s=this.m[4],a=this.m[5],h=this.determinant();if(h<o.Epsilon*o.Epsilon)return t.m[0]=0,t.m[1]=0,t.m[2]=0,t.m[3]=0,t.m[4]=0,t.m[5]=0,this;var l=1/h,u=r*a-n*s,c=i*s-e*a;return t.m[0]=n*l,t.m[1]=-i*l,t.m[2]=-r*l,t.m[3]=e*l,t.m[4]=u*l,t.m[5]=c*l,this},t.prototype.multiplyToRef=function(t,e){var i=this.m[0],r=this.m[1],o=this.m[2],n=this.m[3],s=this.m[4],a=this.m[5],h=t.m[0],l=t.m[1],u=t.m[2],c=t.m[3],_=t.m[4],f=t.m[5];return e.m[0]=i*h+r*u,e.m[1]=i*l+r*c,e.m[2]=o*h+n*u,e.m[3]=o*l+n*c,e.m[4]=s*h+a*u+_,e.m[5]=s*l+a*c+f,this},t.prototype.transformCoordinates=function(t,e,i){return i.x=t*this.m[0]+e*this.m[2]+this.m[4],i.y=t*this.m[1]+e*this.m[3]+this.m[5],this},t.Identity=function(){return new t(1,0,0,1,0,0)},t.TranslationToRef=function(t,e,i){i.fromValues(1,0,0,1,t,e)},t.ScalingToRef=function(t,e,i){i.fromValues(t,0,0,e,0,0)},t.RotationToRef=function(t,e){var i=Math.sin(t),r=Math.cos(t);e.fromValues(r,i,-i,r,0,0)},t.ComposeToRef=function(e,i,r,o,n,s,a){t.TranslationToRef(e,i,t._TempPreTranslationMatrix),t.ScalingToRef(o,n,t._TempScalingMatrix),t.RotationToRef(r,t._TempRotationMatrix),t.TranslationToRef(-e,-i,t._TempPostTranslationMatrix),t._TempPreTranslationMatrix.multiplyToRef(t._TempScalingMatrix,t._TempCompose0),t._TempCompose0.multiplyToRef(t._TempRotationMatrix,t._TempCompose1),s?(t._TempCompose1.multiplyToRef(t._TempPostTranslationMatrix,t._TempCompose2),t._TempCompose2.multiplyToRef(s,a)):t._TempCompose1.multiplyToRef(t._TempPostTranslationMatrix,a)},t._TempPreTranslationMatrix=t.Identity(),t._TempPostTranslationMatrix=t.Identity(),t._TempRotationMatrix=t.Identity(),t._TempScalingMatrix=t.Identity(),t._TempCompose0=t.Identity(),t._TempCompose1=t.Identity(),t._TempCompose2=t.Identity(),t}();e.Matrix2D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=i(6),a=i(5),h=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isChecked=!1,i._background="black",i._checkSizeRatio=.8,i._thickness=1,i.onIsCheckedChangedObservable=new n.Observable,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"checkSizeRatio",{get:function(){return this._checkSizeRatio},set:function(t){t=Math.max(Math.min(1,t),0),this._checkSizeRatio!==t&&(this._checkSizeRatio=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isChecked",{get:function(){return this._isChecked},set:function(t){this._isChecked!==t&&(this._isChecked=t,this._markAsDirty(),this.onIsCheckedChangedObservable.notifyObservers(t))},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"CheckBox"},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=this._currentMeasure.width-this._thickness,r=this._currentMeasure.height-this._thickness;if((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fillRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,i,r),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._isChecked){e.fillStyle=this._isEnabled?this.color:this._disabledColor;var o=i*this._checkSizeRatio,n=r*this._checkSizeRatio;e.fillRect(this._currentMeasure.left+this._thickness/2+(i-o)/2,this._currentMeasure.top+this._thickness/2+(r-n)/2,o,n)}e.strokeStyle=this.color,e.lineWidth=this._thickness,e.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,i,r)}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.isChecked=!this.isChecked,!0)},e.AddCheckBoxWithHeader=function(t,i){var r=new s.StackPanel;r.isVertical=!1,r.height="30px";var n=new e;n.width="20px",n.height="20px",n.isChecked=!0,n.color="green",n.onIsCheckedChangedObservable.add(i),r.addControl(n);var h=new a.TextBlock;return h.text=t,h.width="180px",h.paddingLeft="5px",h.textHorizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,h.color="white",r.addControl(h),r},e}(o.Control);e.Checkbox=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e,i){void 0===i&&(i="");var r=t.call(this,e)||this;return r.name=e,r._text="",r._placeholderText="",r._background="#222222",r._focusedBackground="#000000",r._placeholderColor="gray",r._thickness=1,r._margin=new n.ValueAndUnit(10,n.ValueAndUnit.UNITMODE_PIXEL),r._autoStretchWidth=!0,r._maxWidth=new n.ValueAndUnit(1,n.ValueAndUnit.UNITMODE_PERCENTAGE,!1),r._isFocused=!1,r._blinkIsEven=!1,r._cursorOffset=0,r._deadKey=!1,r._addKey=!0,r._currentKey="",r.promptMessage="Please enter text:",r.onTextChangedObservable=new s.Observable,r.onBeforeKeyAddObservable=new s.Observable,r.onFocusObservable=new s.Observable,r.onBlurObservable=new s.Observable,r.text=i,r}return r(e,t),Object.defineProperty(e.prototype,"maxWidth",{get:function(){return this._maxWidth.toString(this._host)},set:function(t){this._maxWidth.toString(this._host)!==t&&this._maxWidth.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"maxWidthInPixels",{get:function(){return this._maxWidth.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"margin",{get:function(){return this._margin.toString(this._host)},set:function(t){this._margin.toString(this._host)!==t&&this._margin.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"marginInPixels",{get:function(){return this._margin.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"autoStretchWidth",{get:function(){return this._autoStretchWidth},set:function(t){this._autoStretchWidth!==t&&(this._autoStretchWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"focusedBackground",{get:function(){return this._focusedBackground},set:function(t){this._focusedBackground!==t&&(this._focusedBackground=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"placeholderColor",{get:function(){return this._placeholderColor},set:function(t){this._placeholderColor!==t&&(this._placeholderColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"placeholderText",{get:function(){return this._placeholderText},set:function(t){this._placeholderText!==t&&(this._placeholderText=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"deadKey",{get:function(){return this._deadKey},set:function(t){this._deadKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"addKey",{get:function(){return this._addKey},set:function(t){this._addKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"currentKey",{get:function(){return this._currentKey},set:function(t){this._currentKey=t},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._markAsDirty(),this.onTextChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{get:function(){return this._width.toString(this._host)},set:function(t){this._width.toString(this._host)!==t&&(this._width.fromString(t)&&this._markAsDirty(),this.autoStretchWidth=!1)},enumerable:!0,configurable:!0}),e.prototype.onBlur=function(){this._isFocused=!1,this._scrollLeft=null,this._cursorOffset=0,clearTimeout(this._blinkTimeout),this._markAsDirty(),this.onBlurObservable.notifyObservers(this)},e.prototype.onFocus=function(){if(this._isEnabled&&(this._scrollLeft=null,this._isFocused=!0,this._blinkIsEven=!1,this._cursorOffset=0,this._markAsDirty(),this.onFocusObservable.notifyObservers(this),-1!==navigator.userAgent.indexOf("Mobile"))){var t=prompt(this.promptMessage);return null!==t&&(this.text=t),void(this._host.focusedControl=null)}},e.prototype._getTypeName=function(){return"InputText"},e.prototype.keepsFocusWith=function(){return this._connectedVirtualKeyboard?[this._connectedVirtualKeyboard]:null},e.prototype.processKey=function(t,e){switch(t){case 32:e=" ";break;case 8:if(this._text&&this._text.length>0)if(0===this._cursorOffset)this.text=this._text.substr(0,this._text.length-1);else(i=this._text.length-this._cursorOffset)>0&&(this.text=this._text.slice(0,i-1)+this._text.slice(i));return;case 46:if(this._text&&this._text.length>0){var i=this._text.length-this._cursorOffset;this.text=this._text.slice(0,i)+this._text.slice(i+1),this._cursorOffset--}return;case 13:return void(this._host.focusedControl=null);case 35:return this._cursorOffset=0,this._blinkIsEven=!1,void this._markAsDirty();case 36:return this._cursorOffset=this._text.length,this._blinkIsEven=!1,void this._markAsDirty();case 37:return this._cursorOffset++,this._cursorOffset>this._text.length&&(this._cursorOffset=this._text.length),this._blinkIsEven=!1,void this._markAsDirty();case 39:return this._cursorOffset--,this._cursorOffset<0&&(this._cursorOffset=0),this._blinkIsEven=!1,void this._markAsDirty();case 222:return void(this.deadKey=!0)}if(e&&(-1===t||32===t||t>47&&t<58||t>64&&t<91||t>185&&t<193||t>218&&t<223||t>95&&t<112)&&(this._currentKey=e,this.onBeforeKeyAddObservable.notifyObservers(this),e=this._currentKey,this._addKey))if(0===this._cursorOffset)this.text+=e;else{var r=this._text.length-this._cursorOffset;this.text=this._text.slice(0,r)+e+this._text.slice(r)}},e.prototype.processKeyboard=function(t){this.processKey(t.keyCode,t.key)},e.prototype._draw=function(t,e){var i=this;if(e.save(),this._applyStates(e),this._processMeasures(t,e)){(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._isFocused?this._focusedBackground&&(e.fillStyle=this._isEnabled?this._focusedBackground:this._disabledColor,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)):this._background&&(e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height)),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._fontOffset||(this._fontOffset=o.Control._GetFontOffset(e.font));var r=this._currentMeasure.left+this._margin.getValueInPixel(this._host,t.width);this.color&&(e.fillStyle=this.color);var n=this._beforeRenderText(this._text);this._isFocused||this._text||!this._placeholderText||(n=this._placeholderText,this._placeholderColor&&(e.fillStyle=this._placeholderColor)),this._textWidth=e.measureText(n).width;var s=2*this._margin.getValueInPixel(this._host,t.width);this._autoStretchWidth&&(this.width=Math.min(this._maxWidth.getValueInPixel(this._host,t.width),this._textWidth+s)+"px");var a=this._fontOffset.ascent+(this._currentMeasure.height-this._fontOffset.height)/2,h=this._width.getValueInPixel(this._host,t.width)-s;if(e.save(),e.beginPath(),e.rect(r,this._currentMeasure.top+(this._currentMeasure.height-this._fontOffset.height)/2,h+2,this._currentMeasure.height),e.clip(),this._isFocused&&this._textWidth>h){var l=r-this._textWidth+h;this._scrollLeft||(this._scrollLeft=l)}else this._scrollLeft=r;if(e.fillText(n,this._scrollLeft,this._currentMeasure.top+a),this._isFocused){if(this._clickedCoordinate){var u=this._scrollLeft+this._textWidth-this._clickedCoordinate,c=0;this._cursorOffset=0;var _=0;do{this._cursorOffset&&(_=Math.abs(u-c)),this._cursorOffset++,c=e.measureText(n.substr(n.length-this._cursorOffset,this._cursorOffset)).width}while(c<u&&n.length>=this._cursorOffset);Math.abs(u-c)>_&&this._cursorOffset--,this._blinkIsEven=!1,this._clickedCoordinate=null}if(!this._blinkIsEven){var f=this.text.substr(this._text.length-this._cursorOffset),p=e.measureText(f).width,d=this._scrollLeft+this._textWidth-p;d<r?(this._scrollLeft+=r-d,d=r,this._markAsDirty()):d>r+h&&(this._scrollLeft+=r+h-d,d=r+h,this._markAsDirty()),e.fillRect(d,this._currentMeasure.top+(this._currentMeasure.height-this._fontOffset.height)/2,2,this._fontOffset.height)}clearTimeout(this._blinkTimeout),this._blinkTimeout=setTimeout(function(){i._blinkIsEven=!i._blinkIsEven,i._markAsDirty()},500)}e.restore(),this._thickness&&(this.color&&(e.strokeStyle=this.color),e.lineWidth=this._thickness,e.strokeRect(this._currentMeasure.left+this._thickness/2,this._currentMeasure.top+this._thickness/2,this._currentMeasure.width-this._thickness,this._currentMeasure.height-this._thickness))}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._clickedCoordinate=i.x,this._host.focusedControl===this?(clearTimeout(this._blinkTimeout),this._markAsDirty(),!0):!!this._isEnabled&&(this._host.focusedControl=this,!0))},e.prototype._onPointerUp=function(e,i,r,o,n){t.prototype._onPointerUp.call(this,e,i,r,o,n)},e.prototype._beforeRenderText=function(t){return t},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.onBlurObservable.clear(),this.onFocusObservable.clear(),this.onTextChangedObservable.clear()},e}(o.Control);e.InputText=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(2),o=i(0),n=function(){function t(t){this._multiLine=t,this._x=new r.ValueAndUnit(0),this._y=new r.ValueAndUnit(0),this._point=new o.Vector2(0,0)}return Object.defineProperty(t.prototype,"x",{get:function(){return this._x.toString(this._multiLine._host)},set:function(t){this._x.toString(this._multiLine._host)!==t&&this._x.fromString(t)&&this._multiLine._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"y",{get:function(){return this._y.toString(this._multiLine._host)},set:function(t){this._y.toString(this._multiLine._host)!==t&&this._y.fromString(t)&&this._multiLine._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"control",{get:function(){return this._control},set:function(t){this._control!==t&&(this._control&&this._controlObserver&&(this._control.onDirtyObservable.remove(this._controlObserver),this._controlObserver=null),this._control=t,this._control&&(this._controlObserver=this._control.onDirtyObservable.add(this._multiLine.onPointUpdate)),this._multiLine._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"mesh",{get:function(){return this._mesh},set:function(t){this._mesh!==t&&(this._mesh&&this._meshObserver&&this._mesh.getScene().onAfterCameraRenderObservable.remove(this._meshObserver),this._mesh=t,this._mesh&&(this._meshObserver=this._mesh.getScene().onAfterCameraRenderObservable.add(this._multiLine.onPointUpdate)),this._multiLine._markAsDirty())},enumerable:!0,configurable:!0}),t.prototype.resetLinks=function(){this.control=null,this.mesh=null},t.prototype.translate=function(){return this._point=this._translatePoint(),this._point},t.prototype._translatePoint=function(){if(null!=this._mesh)return this._multiLine._host.getProjectedPosition(this._mesh.getBoundingInfo().boundingSphere.center,this._mesh.getWorldMatrix());if(null!=this._control)return new o.Vector2(this._control.centerX,this._control.centerY);var t=this._multiLine._host,e=this._x.getValueInPixel(t,Number(t._canvas.width)),i=this._y.getValueInPixel(t,Number(t._canvas.height));return new o.Vector2(e,i)},t.prototype.dispose=function(){this.resetLinks()},t}();e.MultiLinePoint=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=i(9),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._isChecked=!1,i._background="black",i._checkSizeRatio=.8,i._thickness=1,i.group="",i.onIsCheckedChangedObservable=new n.Observable,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"checkSizeRatio",{get:function(){return this._checkSizeRatio},set:function(t){t=Math.max(Math.min(1,t),0),this._checkSizeRatio!==t&&(this._checkSizeRatio=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isChecked",{get:function(){return this._isChecked},set:function(t){var e=this;this._isChecked!==t&&(this._isChecked=t,this._markAsDirty(),this.onIsCheckedChangedObservable.notifyObservers(t),this._isChecked&&this._host&&this._host.executeOnAllControls(function(t){if(t!==e&&void 0!==t.group){var i=t;i.group===e.group&&(i.isChecked=!1)}}))},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"RadioButton"},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=this._currentMeasure.width-this._thickness,r=this._currentMeasure.height-this._thickness;if((this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),o.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2-this._thickness/2,this._currentMeasure.height/2-this._thickness/2,e),e.fillStyle=this._isEnabled?this._background:this._disabledColor,e.fill(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this.color,e.lineWidth=this._thickness,e.stroke(),this._isChecked){e.fillStyle=this._isEnabled?this.color:this._disabledColor;var n=i*this._checkSizeRatio,s=r*this._checkSizeRatio;o.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,n/2-this._thickness/2,s/2-this._thickness/2,e),e.fill()}}e.restore()},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this.isChecked||(this.isChecked=!0),!0)},e.AddRadioButtonWithHeader=function(t,i,r,n){var a=new s.StackPanel;a.isVertical=!1,a.height="30px";var h=new e;h.width="20px",h.height="20px",h.isChecked=r,h.color="green",h.group=i,h.onIsCheckedChangedObservable.add(function(t){return n(h,t)}),a.addControl(h);var l=new s.TextBlock;return l.text=t,l.width="180px",l.paddingLeft="5px",l.textHorizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,l.color="white",a.addControl(l),a},e}(o.Control);e.RadioButton=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thumbWidth=new n.ValueAndUnit(20,n.ValueAndUnit.UNITMODE_PIXEL,!1),i._minimum=0,i._maximum=100,i._value=50,i._isVertical=!1,i._background="black",i._borderColor="white",i._barOffset=new n.ValueAndUnit(5,n.ValueAndUnit.UNITMODE_PIXEL,!1),i._isThumbCircle=!1,i._isThumbClamped=!1,i.onValueChangedObservable=new s.Observable,i._pointerIsDown=!1,i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"borderColor",{get:function(){return this._borderColor},set:function(t){this._borderColor!==t&&(this._borderColor=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"barOffset",{get:function(){return this._barOffset.toString(this._host)},set:function(t){this._barOffset.toString(this._host)!==t&&this._barOffset.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"barOffsetInPixels",{get:function(){return this._barOffset.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thumbWidth",{get:function(){return this._thumbWidth.toString(this._host)},set:function(t){this._thumbWidth.toString(this._host)!==t&&this._thumbWidth.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"thumbWidthInPixels",{get:function(){return this._thumbWidth.getValueInPixel(this._host,this._cachedParentMeasure.width)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minimum",{get:function(){return this._minimum},set:function(t){this._minimum!==t&&(this._minimum=t,this._markAsDirty(),this.value=Math.max(Math.min(this.value,this._maximum),this._minimum))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"maximum",{get:function(){return this._maximum},set:function(t){this._maximum!==t&&(this._maximum=t,this._markAsDirty(),this.value=Math.max(Math.min(this.value,this._maximum),this._minimum))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"value",{get:function(){return this._value},set:function(t){t=Math.max(Math.min(t,this._maximum),this._minimum),this._value!==t&&(this._value=t,this._markAsDirty(),this.onValueChangedObservable.notifyObservers(this._value))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){this._isVertical!==t&&(this._isVertical=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isThumbCircle",{get:function(){return this._isThumbCircle},set:function(t){this._isThumbCircle!==t&&(this._isThumbCircle=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isThumbClamped",{get:function(){return this._isThumbClamped},set:function(t){this._isThumbClamped!==t&&(this._isThumbClamped=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Slider"},e.prototype._getThumbThickness=function(t,e){var i=0;switch(t){case"circle":i=this._thumbWidth.isPixel?Math.max(this._thumbWidth.getValue(this._host),e):e*this._thumbWidth.getValue(this._host);break;case"rectangle":i=this._thumbWidth.isPixel?Math.min(this._thumbWidth.getValue(this._host),e):e*this._thumbWidth.getValue(this._host)}return i},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=0,r=this.isThumbCircle?"circle":"rectangle",o=this._currentMeasure.left,n=this._currentMeasure.top,s=this._currentMeasure.width,a=this._currentMeasure.height,h=Math.max(this._currentMeasure.width,this._currentMeasure.height),l=Math.min(this._currentMeasure.width,this._currentMeasure.height),u=this._getThumbThickness(r,l);h-=u;var c=0;if(this._isVertical&&this._currentMeasure.height<this._currentMeasure.width)return void console.error("Height should be greater than width");l-=2*(i=this._barOffset.isPixel?Math.min(this._barOffset.getValue(this._host),l):l*this._barOffset.getValue(this._host)),this._isVertical?(o+=i,this.isThumbClamped||(n+=u/2),a=h,s=l):(n+=i,this.isThumbClamped||(o+=u/2),a=l,s=h),this.isThumbClamped&&this.isThumbCircle?(this._isVertical?n+=u/2:o+=u/2,c=l/2):c=(u-i)/2,(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY);var _=this._isVertical?(this._maximum-this._value)/(this._maximum-this._minimum)*h:(this._value-this._minimum)/(this._maximum-this._minimum)*h;e.fillStyle=this._background,this._isVertical?this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+l/2,n,c,Math.PI,2*Math.PI),e.fill(),e.fillRect(o,n,s,a)):e.fillRect(o,n,s,a+u):e.fillRect(o,n,s,a):this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+h,n+l/2,c,0,2*Math.PI),e.fill(),e.fillRect(o,n,s,a)):e.fillRect(o,n,s+u,a):e.fillRect(o,n,s,a),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.fillStyle=this.color,this._isVertical?this.isThumbClamped?this.isThumbCircle?(e.beginPath(),e.arc(o+l/2,n+h,c,0,2*Math.PI),e.fill(),e.fillRect(o,n+_,s,a-_)):e.fillRect(o,n+_,s,this._currentMeasure.height-_):e.fillRect(o,n+_,s,a-_):this.isThumbClamped&&this.isThumbCircle?(e.beginPath(),e.arc(o,n+l/2,c,0,2*Math.PI),e.fill(),e.fillRect(o,n,_,a)):e.fillRect(o,n,_,a),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._isThumbCircle?(e.beginPath(),this._isVertical?e.arc(o+l/2,n+_,c,0,2*Math.PI):e.arc(o+_,n+l/2,c,0,2*Math.PI),e.fill(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this._borderColor,e.stroke()):(this._isVertical?e.fillRect(o-i,this._currentMeasure.top+_,this._currentMeasure.width,u):e.fillRect(this._currentMeasure.left+_,this._currentMeasure.top,u,this._currentMeasure.height),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=this._borderColor,this._isVertical?e.strokeRect(o-i,this._currentMeasure.top+_,this._currentMeasure.width,u):e.strokeRect(this._currentMeasure.left+_,this._currentMeasure.top,u,this._currentMeasure.height))}e.restore()},e.prototype._updateValueFromPointer=function(t,e){0!=this.rotation&&(this._invertTransformMatrix.transformCoordinates(t,e,this._transformedPosition),t=this._transformedPosition.x,e=this._transformedPosition.y),this._isVertical?this.value=this._minimum+(1-(e-this._currentMeasure.top)/this._currentMeasure.height)*(this._maximum-this._minimum):this.value=this._minimum+(t-this._currentMeasure.left)/this._currentMeasure.width*(this._maximum-this._minimum)},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._pointerIsDown=!0,this._updateValueFromPointer(i.x,i.y),this._host._capturingControl[r]=this,!0)},e.prototype._onPointerMove=function(e,i){this._pointerIsDown&&this._updateValueFromPointer(i.x,i.y),t.prototype._onPointerMove.call(this,e,i)},e.prototype._onPointerUp=function(e,i,r,o,n){this._pointerIsDown=!1,delete this._host._capturingControl[r],t.prototype._onPointerUp.call(this,e,i,r,o,n)},e}(o.Control);e.Slider=a},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(2),n=function(){function t(t){this._fontFamily="Arial",this._fontStyle="",this._fontWeight="",this._fontSize=new o.ValueAndUnit(18,o.ValueAndUnit.UNITMODE_PIXEL,!1),this.onChangedObservable=new r.Observable,this._host=t}return Object.defineProperty(t.prototype,"fontSize",{get:function(){return this._fontSize.toString(this._host)},set:function(t){this._fontSize.toString(this._host)!==t&&this._fontSize.fromString(t)&&this.onChangedObservable.notifyObservers(this)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontFamily",{get:function(){return this._fontFamily},set:function(t){this._fontFamily!==t&&(this._fontFamily=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontStyle",{get:function(){return this._fontStyle},set:function(t){this._fontStyle!==t&&(this._fontStyle=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"fontWeight",{get:function(){return this._fontWeight},set:function(t){this._fontWeight!==t&&(this._fontWeight=t,this.onChangedObservable.notifyObservers(this))},enumerable:!0,configurable:!0}),t.prototype.dispose=function(){this.onChangedObservable.clear()},t}();e.Style=n},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(13),n=i(0),s=function(t){function e(e){return t.call(this,e)||this}return r(e,t),e.prototype._getTypeName=function(){return"AbstractButton3D"},e.prototype._createNode=function(t){return new n.TransformNode("button"+this.name)},e}(o.Control3D);e.AbstractButton3D=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e,i){void 0===i&&(i=0);var r=t.call(this,e.x,e.y,e.z)||this;return r.buttonIndex=i,r}return r(e,t),e}(i(0).Vector3);e.Vector3WithInfo=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}(),o=this&&this.__decorate||function(t,e,i,r){var o,n=arguments.length,s=n<3?e:null===r?r=Object.getOwnPropertyDescriptor(e,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(t,e,i,r);else for(var a=t.length-1;a>=0;a--)(o=t[a])&&(s=(n<3?o(s):n>3?o(e,i,s):o(e,i))||s);return n>3&&s&&Object.defineProperty(e,i,s),s};Object.defineProperty(e,"__esModule",{value:!0});var n=i(0);i(44).registerShader();var s=function(t){function e(){var e=t.call(this)||this;return e.INNERGLOW=!1,e.BORDER=!1,e.HOVERLIGHT=!1,e.TEXTURE=!1,e.rebuild(),e}return r(e,t),e}(n.MaterialDefines);e.FluentMaterialDefines=s;var a=function(t){function e(e,i){var r=t.call(this,e,i)||this;return r.innerGlowColorIntensity=.5,r.innerGlowColor=new n.Color3(1,1,1),r.alpha=1,r.albedoColor=new n.Color3(.3,.35,.4),r.renderBorders=!1,r.borderWidth=.5,r.edgeSmoothingValue=.02,r.borderMinValue=.1,r.renderHoverLight=!1,r.hoverRadius=1,r.hoverColor=new n.Color4(.3,.3,.3,1),r.hoverPosition=n.Vector3.Zero(),r}return r(e,t),e.prototype.needAlphaBlending=function(){return 1!==this.alpha},e.prototype.needAlphaTesting=function(){return!1},e.prototype.getAlphaTestTexture=function(){return null},e.prototype.isReadyForSubMesh=function(t,e,i){if(this.isFrozen&&this._wasPreviouslyReady&&e.effect)return!0;e._materialDefines||(e._materialDefines=new s);var r=this.getScene(),o=e._materialDefines;if(!this.checkReadyOnEveryCall&&e.effect&&o._renderId===r.getRenderId())return!0;if(o._areTexturesDirty)if(o.INNERGLOW=this.innerGlowColorIntensity>0,o.BORDER=this.renderBorders,o.HOVERLIGHT=this.renderHoverLight,this._albedoTexture){if(!this._albedoTexture.isReadyOrNotBlocking())return!1;o.TEXTURE=!0}else o.TEXTURE=!1;var a=r.getEngine();if(o.isDirty){o.markAsProcessed(),r.resetCachedMaterial();var h=[n.VertexBuffer.PositionKind];h.push(n.VertexBuffer.NormalKind),h.push(n.VertexBuffer.UVKind);var l=["world","viewProjection","innerGlowColor","albedoColor","borderWidth","edgeSmoothingValue","scaleFactor","borderMinValue","hoverColor","hoverPosition","hoverRadius"],u=["albedoSampler"],c=new Array;n.MaterialHelper.PrepareUniformsAndSamplersList({uniformsNames:l,uniformBuffersNames:c,samplers:u,defines:o,maxSimultaneousLights:4});var _=o.toString();e.setEffect(r.getEngine().createEffect("fluent",{attributes:h,uniformsNames:l,uniformBuffersNames:c,samplers:u,defines:_,fallbacks:null,onCompiled:this.onCompiled,onError:this.onError,indexParameters:{maxSimultaneousLights:4}},a))}return!(!e.effect||!e.effect.isReady())&&(o._renderId=r.getRenderId(),this._wasPreviouslyReady=!0,!0)},e.prototype.bindForSubMesh=function(t,e,i){var r=this.getScene(),o=i._materialDefines;if(o){var s=i.effect;s&&(this._activeEffect=s,this.bindOnlyWorldMatrix(t),this._activeEffect.setMatrix("viewProjection",r.getTransformMatrix()),this._mustRebind(r,s)&&(this._activeEffect.setColor4("albedoColor",this.albedoColor,this.alpha),o.INNERGLOW&&this._activeEffect.setColor4("innerGlowColor",this.innerGlowColor,this.innerGlowColorIntensity),o.BORDER&&(this._activeEffect.setFloat("borderWidth",this.borderWidth),this._activeEffect.setFloat("edgeSmoothingValue",this.edgeSmoothingValue),this._activeEffect.setFloat("borderMinValue",this.borderMinValue),e.getBoundingInfo().boundingBox.extendSize.multiplyToRef(e.scaling,n.Tmp.Vector3[0]),this._activeEffect.setVector3("scaleFactor",n.Tmp.Vector3[0])),o.HOVERLIGHT&&(this._activeEffect.setDirectColor4("hoverColor",this.hoverColor),this._activeEffect.setFloat("hoverRadius",this.hoverRadius),this._activeEffect.setVector3("hoverPosition",this.hoverPosition)),o.TEXTURE&&this._activeEffect.setTexture("albedoSampler",this._albedoTexture)),this._afterBind(e,this._activeEffect))}},e.prototype.getActiveTextures=function(){return t.prototype.getActiveTextures.call(this)},e.prototype.hasTexture=function(e){return!!t.prototype.hasTexture.call(this,e)},e.prototype.dispose=function(e){t.prototype.dispose.call(this,e)},e.prototype.clone=function(t){var i=this;return n.SerializationHelper.Clone(function(){return new e(t,i.getScene())},this)},e.prototype.serialize=function(){var t=n.SerializationHelper.Serialize(this);return t.customType="BABYLON.GUI.FluentMaterial",t},e.prototype.getClassName=function(){return"FluentMaterial"},e.Parse=function(t,i,r){return n.SerializationHelper.Parse(function(){return new e(t.name,i)},t,i,r)},o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"innerGlowColorIntensity",void 0),o([n.serializeAsColor3()],e.prototype,"innerGlowColor",void 0),o([n.serialize()],e.prototype,"alpha",void 0),o([n.serializeAsColor3()],e.prototype,"albedoColor",void 0),o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"renderBorders",void 0),o([n.serialize()],e.prototype,"borderWidth",void 0),o([n.serialize()],e.prototype,"edgeSmoothingValue",void 0),o([n.serialize()],e.prototype,"borderMinValue",void 0),o([n.serialize(),n.expandToProperty("_markAllSubMeshesAsTexturesDirty")],e.prototype,"renderHoverLight",void 0),o([n.serialize()],e.prototype,"hoverRadius",void 0),o([n.serializeAsColor4()],e.prototype,"hoverColor",void 0),o([n.serializeAsVector3()],e.prototype,"hoverPosition",void 0),o([n.serializeAsTexture("albedoTexture")],e.prototype,"_albedoTexture",void 0),o([n.expandToProperty("_markAllSubMeshesAsTexturesAndMiscDirty")],e.prototype,"albedoTexture",void 0),e}(n.PushMaterial);e.FluentMaterial=a},function(t,e,i){"use strict";(function(t){Object.defineProperty(e,"__esModule",{value:!0});var r=i(15),o=void 0!==t?t:"undefined"!=typeof window?window:void 0;void 0!==o&&(o.BABYLON=o.BABYLON||{},o.BABYLON.GUI=r),function(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}(i(15))}).call(this,i(28))},function(t,e){var i;i=function(){return this}();try{i=i||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(i=window)}t.exports=i},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(9)),r(i(12)),r(i(17)),r(i(7)),r(i(20)),r(i(23)),r(i(2))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(0),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._value=n.Color3.Red(),i._tmpColor=new n.Color3,i._pointerStartedOnSquare=!1,i._pointerStartedOnWheel=!1,i._squareLeft=0,i._squareTop=0,i._squareSize=0,i._h=360,i._s=1,i._v=1,i.onValueChangedObservable=new n.Observable,i._pointerIsDown=!1,i.value=new n.Color3(.88,.1,.1),i.size="200px",i.isPointerBlocker=!0,i}return r(e,t),Object.defineProperty(e.prototype,"value",{get:function(){return this._value},set:function(t){this._value.equals(t)||(this._value.copyFrom(t),this._RGBtoHSV(this._value,this._tmpColor),this._h=this._tmpColor.r,this._s=Math.max(this._tmpColor.g,1e-5),this._v=Math.max(this._tmpColor.b,1e-5),this._markAsDirty(),this.onValueChangedObservable.notifyObservers(this._value))},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"width",{set:function(t){this._width.toString(this._host)!==t&&this._width.fromString(t)&&(this._height.fromString(t),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"height",{set:function(t){this._height.toString(this._host)!==t&&this._height.fromString(t)&&(this._width.fromString(t),this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"size",{get:function(){return this.width},set:function(t){this.width=t},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"ColorPicker"},e.prototype._updateSquareProps=function(){var t=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),e=2*(t-.2*t)/Math.sqrt(2),i=t-.5*e;this._squareLeft=this._currentMeasure.left+i,this._squareTop=this._currentMeasure.top+i,this._squareSize=e},e.prototype._drawGradientSquare=function(t,e,i,r,o,n){var s=n.createLinearGradient(e,i,r+e,i);s.addColorStop(0,"#fff"),s.addColorStop(1,"hsl("+t+", 100%, 50%)"),n.fillStyle=s,n.fillRect(e,i,r,o);var a=n.createLinearGradient(e,i,e,o+i);a.addColorStop(0,"rgba(0,0,0,0)"),a.addColorStop(1,"#000"),n.fillStyle=a,n.fillRect(e,i,r,o)},e.prototype._drawCircle=function(t,e,i,r){r.beginPath(),r.arc(t,e,i+1,0,2*Math.PI,!1),r.lineWidth=3,r.strokeStyle="#333333",r.stroke(),r.beginPath(),r.arc(t,e,i,0,2*Math.PI,!1),r.lineWidth=3,r.strokeStyle="#ffffff",r.stroke()},e.prototype._createColorWheelCanvas=function(t,e){var i=document.createElement("canvas");i.width=2*t,i.height=2*t;for(var r=i.getContext("2d"),o=r.getImageData(0,0,2*t,2*t),n=o.data,s=this._tmpColor,a=t*t,h=t-e,l=h*h,u=-t;u<t;u++)for(var c=-t;c<t;c++){var _=u*u+c*c;if(!(_>a||_<l)){var f=Math.sqrt(_),p=Math.atan2(c,u);this._HSVtoRGB(180*p/Math.PI+180,f/t,1,s);var d=4*(u+t+2*(c+t)*t);n[d]=255*s.r,n[d+1]=255*s.g,n[d+2]=255*s.b;var y=.2;y=t<50?.2:t>150?.04:-.16*(t-50)/100+.2;var g=(f-h)/(t-h);n[d+3]=g<y?g/y*255:g>1-y?255*(1-(g-(1-y))/y):255}}return r.putImageData(o,0,0),i},e.prototype._RGBtoHSV=function(t,e){var i=t.r,r=t.g,o=t.b,n=Math.max(i,r,o),s=Math.min(i,r,o),a=0,h=0,l=n,u=n-s;0!==n&&(h=u/n),n!=s&&(n==i?(a=(r-o)/u,r<o&&(a+=6)):n==r?a=(o-i)/u+2:n==o&&(a=(i-r)/u+4),a*=60),e.r=a,e.g=h,e.b=l},e.prototype._HSVtoRGB=function(t,e,i,r){var o=i*e,n=t/60,s=o*(1-Math.abs(n%2-1)),a=0,h=0,l=0;n>=0&&n<=1?(a=o,h=s):n>=1&&n<=2?(a=s,h=o):n>=2&&n<=3?(h=o,l=s):n>=3&&n<=4?(h=s,l=o):n>=4&&n<=5?(a=s,l=o):n>=5&&n<=6&&(a=o,l=s);var u=i-o;r.set(a+u,h+u,l+u)},e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._processMeasures(t,e)){var i=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),r=.2*i,o=this._currentMeasure.left,n=this._currentMeasure.top;this._colorWheelCanvas&&this._colorWheelCanvas.width==2*i||(this._colorWheelCanvas=this._createColorWheelCanvas(i,r)),this._updateSquareProps(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY,e.fillRect(this._squareLeft,this._squareTop,this._squareSize,this._squareSize)),e.drawImage(this._colorWheelCanvas,o,n),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowBlur=0,e.shadowOffsetX=0,e.shadowOffsetY=0),this._drawGradientSquare(this._h,this._squareLeft,this._squareTop,this._squareSize,this._squareSize,e);var s=this._squareLeft+this._squareSize*this._s,a=this._squareTop+this._squareSize*(1-this._v);this._drawCircle(s,a,.04*i,e);var h=i-.5*r;s=o+i+Math.cos((this._h-180)*Math.PI/180)*h,a=n+i+Math.sin((this._h-180)*Math.PI/180)*h,this._drawCircle(s,a,.35*r,e)}e.restore()},e.prototype._updateValueFromPointer=function(t,e){if(this._pointerStartedOnWheel){var i=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),r=i+this._currentMeasure.left,o=i+this._currentMeasure.top;this._h=180*Math.atan2(e-o,t-r)/Math.PI+180}else this._pointerStartedOnSquare&&(this._updateSquareProps(),this._s=(t-this._squareLeft)/this._squareSize,this._v=1-(e-this._squareTop)/this._squareSize,this._s=Math.min(this._s,1),this._s=Math.max(this._s,1e-5),this._v=Math.min(this._v,1),this._v=Math.max(this._v,1e-5));this._HSVtoRGB(this._h,this._s,this._v,this._tmpColor),this.value=this._tmpColor},e.prototype._isPointOnSquare=function(t){this._updateSquareProps();var e=this._squareLeft,i=this._squareTop,r=this._squareSize;return t.x>=e&&t.x<=e+r&&t.y>=i&&t.y<=i+r},e.prototype._isPointOnWheel=function(t){var e=.5*Math.min(this._currentMeasure.width,this._currentMeasure.height),i=e+this._currentMeasure.left,r=e+this._currentMeasure.top,o=e-.2*e,n=e*e,s=o*o,a=t.x-i,h=t.y-r,l=a*a+h*h;return l<=n&&l>=s},e.prototype._onPointerDown=function(e,i,r,o){return!!t.prototype._onPointerDown.call(this,e,i,r,o)&&(this._pointerIsDown=!0,this._pointerStartedOnSquare=!1,this._pointerStartedOnWheel=!1,this._isPointOnSquare(i)?this._pointerStartedOnSquare=!0:this._isPointOnWheel(i)&&(this._pointerStartedOnWheel=!0),this._updateValueFromPointer(i.x,i.y),this._host._capturingControl[r]=this,!0)},e.prototype._onPointerMove=function(e,i){this._pointerIsDown&&this._updateValueFromPointer(i.x,i.y),t.prototype._onPointerMove.call(this,e,i)},e.prototype._onPointerUp=function(e,i,r,o,n){this._pointerIsDown=!1,delete this._host._capturingControl[r],t.prototype._onPointerUp.call(this,e,i,r,o,n)},e}(o.Control);e.ColorPicker=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(1),s=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._thickness=1,i}return r(e,t),Object.defineProperty(e.prototype,"thickness",{get:function(){return this._thickness},set:function(t){this._thickness!==t&&(this._thickness=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Ellipse"},e.prototype._localDraw=function(t){t.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowColor=this.shadowColor,t.shadowBlur=this.shadowBlur,t.shadowOffsetX=this.shadowOffsetX,t.shadowOffsetY=this.shadowOffsetY),n.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2-this._thickness/2,this._currentMeasure.height/2-this._thickness/2,t),this._background&&(t.fillStyle=this._background,t.fill()),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0),this._thickness&&(this.color&&(t.strokeStyle=this.color),t.lineWidth=this._thickness,t.stroke()),t.restore()},e.prototype._additionalProcessing=function(e,i){t.prototype._additionalProcessing.call(this,e,i),this._measureForChildren.width-=2*this._thickness,this._measureForChildren.height-=2*this._thickness,this._measureForChildren.left+=this._thickness,this._measureForChildren.top+=this._thickness},e.prototype._clipForChildren=function(t){n.Control.drawEllipse(this._currentMeasure.left+this._currentMeasure.width/2,this._currentMeasure.top+this._currentMeasure.height/2,this._currentMeasure.width/2,this._currentMeasure.height/2,t),t.clip()},e}(o.Container);e.Ellipse=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(4),n=i(2),s=i(1),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._rowDefinitions=new Array,i._columnDefinitions=new Array,i._cells={},i._childControls=new Array,i}return r(e,t),Object.defineProperty(e.prototype,"children",{get:function(){return this._childControls},enumerable:!0,configurable:!0}),e.prototype.addRowDefinition=function(t,e){return void 0===e&&(e=!1),this._rowDefinitions.push(new n.ValueAndUnit(t,e?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE)),this._markAsDirty(),this},e.prototype.addColumnDefinition=function(t,e){return void 0===e&&(e=!1),this._columnDefinitions.push(new n.ValueAndUnit(t,e?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE)),this._markAsDirty(),this},e.prototype.setRowDefinition=function(t,e,i){return void 0===i&&(i=!1),t<0||t>=this._rowDefinitions.length?this:(this._rowDefinitions[t]=new n.ValueAndUnit(e,i?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE),this._markAsDirty(),this)},e.prototype.setColumnDefinition=function(t,e,i){return void 0===i&&(i=!1),t<0||t>=this._columnDefinitions.length?this:(this._columnDefinitions[t]=new n.ValueAndUnit(e,i?n.ValueAndUnit.UNITMODE_PIXEL:n.ValueAndUnit.UNITMODE_PERCENTAGE),this._markAsDirty(),this)},e.prototype._removeCell=function(e,i){if(e){t.prototype.removeControl.call(this,e);for(var r=0,o=e.children;r<o.length;r++){var n=o[r],s=this._childControls.indexOf(n);-1!==s&&this._childControls.splice(s,1)}delete this._cells[i]}},e.prototype._offsetCell=function(t,e){if(this._cells[e]){this._cells[t]=this._cells[e];for(var i=0,r=this._cells[t].children;i<r.length;i++){r[i]._tag=t}delete this._cells[e]}},e.prototype.removeColumnDefinition=function(t){if(t<0||t>=this._columnDefinitions.length)return this;for(var e=0;e<this._rowDefinitions.length;e++){var i=e+":"+t,r=this._cells[i];this._removeCell(r,i)}for(e=0;e<this._rowDefinitions.length;e++)for(var o=t+1;o<this._columnDefinitions.length;o++){var n=e+":"+(o-1);i=e+":"+o;this._offsetCell(n,i)}return this._columnDefinitions.splice(t,1),this._markAsDirty(),this},e.prototype.removeRowDefinition=function(t){if(t<0||t>=this._rowDefinitions.length)return this;for(var e=0;e<this._columnDefinitions.length;e++){var i=t+":"+e,r=this._cells[i];this._removeCell(r,i)}for(e=0;e<this._columnDefinitions.length;e++)for(var o=t+1;o<this._rowDefinitions.length;o++){var n=o-1+":"+e;i=o+":"+e;this._offsetCell(n,i)}return this._rowDefinitions.splice(t,1),this._markAsDirty(),this},e.prototype.addControl=function(e,i,r){void 0===i&&(i=0),void 0===r&&(r=0),0===this._rowDefinitions.length&&this.addRowDefinition(1,!1),0===this._columnDefinitions.length&&this.addColumnDefinition(1,!1);var n=Math.min(i,this._rowDefinitions.length-1)+":"+Math.min(r,this._columnDefinitions.length-1),a=this._cells[n];return a||(a=new o.Container(n),this._cells[n]=a,a.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,a.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,t.prototype.addControl.call(this,a)),a.addControl(e),this._childControls.push(e),e._tag=n,this._markAsDirty(),this},e.prototype.removeControl=function(t){var e=this._childControls.indexOf(t);-1!==e&&this._childControls.splice(e,1);var i=this._cells[t._tag];return i&&i.removeControl(t),this._markAsDirty(),this},e.prototype._getTypeName=function(){return"Grid"},e.prototype._additionalProcessing=function(e,i){for(var r=[],o=[],n=[],s=[],a=this._currentMeasure.width,h=0,l=this._currentMeasure.height,u=0,c=0,_=0,f=this._rowDefinitions;_<f.length;_++){if((b=f[_]).isPixel)l-=g=b.getValue(this._host),o[c]=g;else u+=b.internalValue;c++}var p=0;c=0;for(var d=0,y=this._rowDefinitions;d<y.length;d++){var g,b=y[d];if(s.push(p),b.isPixel)p+=b.getValue(this._host);else p+=g=b.internalValue/u*l,o[c]=g;c++}c=0;for(var m=0,v=this._columnDefinitions;m<v.length;m++){if((b=v[m]).isPixel)a-=w=b.getValue(this._host),r[c]=w;else h+=b.internalValue;c++}var O=0;c=0;for(var P=0,C=this._columnDefinitions;P<C.length;P++){var w;b=C[P];if(n.push(O),b.isPixel)O+=b.getValue(this._host);else O+=w=b.internalValue/h*a,r[c]=w;c++}for(var T in this._cells)if(this._cells.hasOwnProperty(T)){var M=T.split(":"),x=parseInt(M[0]),A=parseInt(M[1]),k=this._cells[T];k.left=n[A]+"px",k.top=s[x]+"px",k.width=r[A]+"px",k.height=o[x]+"px"}t.prototype._additionalProcessing.call(this,e,i)},e.prototype.dispose=function(){t.prototype.dispose.call(this);for(var e=0,i=this._childControls;e<i.length;e++){i[e].dispose()}},e}(o.Container);e.Grid=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype._beforeRenderText=function(t){for(var e="",i=0;i<t.length;i++)e+="•";return e},e}(i(19).InputText);e.InputPassword=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(2),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._lineWidth=1,i._x1=new n.ValueAndUnit(0),i._y1=new n.ValueAndUnit(0),i._x2=new n.ValueAndUnit(0),i._y2=new n.ValueAndUnit(0),i._dash=new Array,i.isHitTestVisible=!1,i._horizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,i._verticalAlignment=o.Control.VERTICAL_ALIGNMENT_TOP,i}return r(e,t),Object.defineProperty(e.prototype,"dash",{get:function(){return this._dash},set:function(t){this._dash!==t&&(this._dash=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"connectedControl",{get:function(){return this._connectedControl},set:function(t){var e=this;this._connectedControl!==t&&(this._connectedControlDirtyObserver&&this._connectedControl&&(this._connectedControl.onDirtyObservable.remove(this._connectedControlDirtyObserver),this._connectedControlDirtyObserver=null),t&&(this._connectedControlDirtyObserver=t.onDirtyObservable.add(function(){return e._markAsDirty()})),this._connectedControl=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"x1",{get:function(){return this._x1.toString(this._host)},set:function(t){this._x1.toString(this._host)!==t&&this._x1.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"y1",{get:function(){return this._y1.toString(this._host)},set:function(t){this._y1.toString(this._host)!==t&&this._y1.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"x2",{get:function(){return this._x2.toString(this._host)},set:function(t){this._x2.toString(this._host)!==t&&this._x2.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"y2",{get:function(){return this._y2.toString(this._host)},set:function(t){this._y2.toString(this._host)!==t&&this._y2.fromString(t)&&this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"lineWidth",{get:function(){return this._lineWidth},set:function(t){this._lineWidth!==t&&(this._lineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"horizontalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"verticalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"_effectiveX2",{get:function(){return(this._connectedControl?this._connectedControl.centerX:0)+this._x2.getValue(this._host)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"_effectiveY2",{get:function(){return(this._connectedControl?this._connectedControl.centerY:0)+this._y2.getValue(this._host)},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"Line"},e.prototype._draw=function(t,e){e.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._applyStates(e),this._processMeasures(t,e)&&(e.strokeStyle=this.color,e.lineWidth=this._lineWidth,e.setLineDash(this._dash),e.beginPath(),e.moveTo(this._x1.getValue(this._host),this._y1.getValue(this._host)),e.lineTo(this._effectiveX2,this._effectiveY2),e.stroke()),e.restore()},e.prototype._measure=function(){this._currentMeasure.width=Math.abs(this._x1.getValue(this._host)-this._effectiveX2)+this._lineWidth,this._currentMeasure.height=Math.abs(this._y1.getValue(this._host)-this._effectiveY2)+this._lineWidth},e.prototype._computeAlignment=function(t,e){this._currentMeasure.left=Math.min(this._x1.getValue(this._host),this._effectiveX2)-this._lineWidth/2,this._currentMeasure.top=Math.min(this._y1.getValue(this._host),this._effectiveY2)-this._lineWidth/2},e.prototype.moveToVector3=function(t,e,i){if(void 0===i&&(i=!1),this._host&&this._root===this._host._rootContainer){var r=this._host._getGlobalViewport(e),o=s.Vector3.Project(t,s.Matrix.Identity(),e.getTransformMatrix(),r);this._moveToProjectedPosition(o,i),o.z<0||o.z>1?this.notRenderable=!0:this.notRenderable=!1}else s.Tools.Error("Cannot move a control to a vector3 if the control is not at root level")},e.prototype._moveToProjectedPosition=function(t,e){void 0===e&&(e=!1);var i=t.x+this._linkOffsetX.getValue(this._host)+"px",r=t.y+this._linkOffsetY.getValue(this._host)+"px";e?(this.x2=i,this.y2=r,this._x2.ignoreAdaptiveScaling=!0,this._y2.ignoreAdaptiveScaling=!0):(this.x1=i,this.y1=r,this._x1.ignoreAdaptiveScaling=!0,this._y1.ignoreAdaptiveScaling=!0)},e}(o.Control);e.Line=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(1),n=i(20),s=i(0),a=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._lineWidth=1,i.onPointUpdate=function(){i._markAsDirty()},i.isHitTestVisible=!1,i._horizontalAlignment=o.Control.HORIZONTAL_ALIGNMENT_LEFT,i._verticalAlignment=o.Control.VERTICAL_ALIGNMENT_TOP,i._dash=[],i._points=[],i}return r(e,t),Object.defineProperty(e.prototype,"dash",{get:function(){return this._dash},set:function(t){this._dash!==t&&(this._dash=t,this._markAsDirty())},enumerable:!0,configurable:!0}),e.prototype.getAt=function(t){return this._points[t]||(this._points[t]=new n.MultiLinePoint(this)),this._points[t]},e.prototype.add=function(){for(var t=this,e=[],i=0;i<arguments.length;i++)e[i]=arguments[i];return e.map(function(e){return t.push(e)})},e.prototype.push=function(t){var e=this.getAt(this._points.length);return null==t?e:(t instanceof s.AbstractMesh?e.mesh=t:t instanceof o.Control?e.control=t:null!=t.x&&null!=t.y&&(e.x=t.x,e.y=t.y),e)},e.prototype.remove=function(t){var e;if(t instanceof n.MultiLinePoint){if(-1===(e=this._points.indexOf(t)))return}else e=t;var i=this._points[e];i&&(i.dispose(),this._points.splice(e,1))},e.prototype.reset=function(){for(;this._points.length>0;)this.remove(this._points.length-1)},e.prototype.resetLinks=function(){this._points.forEach(function(t){null!=t&&t.resetLinks()})},Object.defineProperty(e.prototype,"lineWidth",{get:function(){return this._lineWidth},set:function(t){this._lineWidth!==t&&(this._lineWidth=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"horizontalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"verticalAlignment",{set:function(t){},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"MultiLine"},e.prototype._draw=function(t,e){if(e.save(),(this.shadowBlur||this.shadowOffsetX||this.shadowOffsetY)&&(e.shadowColor=this.shadowColor,e.shadowBlur=this.shadowBlur,e.shadowOffsetX=this.shadowOffsetX,e.shadowOffsetY=this.shadowOffsetY),this._applyStates(e),this._processMeasures(t,e)){e.strokeStyle=this.color,e.lineWidth=this._lineWidth,e.setLineDash(this._dash),e.beginPath();var i=!0;this._points.forEach(function(t){t&&(i?(e.moveTo(t._point.x,t._point.y),i=!1):e.lineTo(t._point.x,t._point.y))}),e.stroke()}e.restore()},e.prototype._additionalProcessing=function(t,e){var i=this;this._minX=null,this._minY=null,this._maxX=null,this._maxY=null,this._points.forEach(function(t,e){t&&(t.translate(),(null==i._minX||t._point.x<i._minX)&&(i._minX=t._point.x),(null==i._minY||t._point.y<i._minY)&&(i._minY=t._point.y),(null==i._maxX||t._point.x>i._maxX)&&(i._maxX=t._point.x),(null==i._maxY||t._point.y>i._maxY)&&(i._maxY=t._point.y))}),null==this._minX&&(this._minX=0),null==this._minY&&(this._minY=0),null==this._maxX&&(this._maxX=0),null==this._maxY&&(this._maxY=0)},e.prototype._measure=function(){null!=this._minX&&null!=this._maxX&&null!=this._minY&&null!=this._maxY&&(this._currentMeasure.width=Math.abs(this._maxX-this._minX)+this._lineWidth,this._currentMeasure.height=Math.abs(this._maxY-this._minY)+this._lineWidth)},e.prototype._computeAlignment=function(t,e){null!=this._minX&&null!=this._minY&&(this._currentMeasure.left=this._minX-this._lineWidth/2,this._currentMeasure.top=this._minY-this._lineWidth/2)},e.prototype.dispose=function(){this.reset(),t.prototype.dispose.call(this)},e}(o.Control);e.MultiLine=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(10),n=i(6),s=i(1),a=i(5),h=i(18),l=i(21),u=i(22),c=i(4),_=function(){function t(t){this.name=t,this._groupPanel=new n.StackPanel,this._selectors=new Array,this._groupPanel.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,this._groupPanel.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,this._groupHeader=this._addGroupHeader(t)}return Object.defineProperty(t.prototype,"groupPanel",{get:function(){return this._groupPanel},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"selectors",{get:function(){return this._selectors},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"header",{get:function(){return this._groupHeader.text},set:function(t){"label"!==this._groupHeader.text&&(this._groupHeader.text=t)},enumerable:!0,configurable:!0}),t.prototype._addGroupHeader=function(t){var e=new a.TextBlock("groupHead",t);return e.width=.9,e.height="30px",e.textWrapping=!0,e.color="black",e.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.textHorizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.left="2px",this._groupPanel.addControl(e),e},t.prototype._getSelector=function(t){if(!(t<0||t>=this._selectors.length))return this._selectors[t]},t.prototype.removeSelector=function(t){t<0||t>=this._selectors.length||(this._groupPanel.removeControl(this._selectors[t]),this._selectors.splice(t,1))},t}();e.SelectorGroup=_;var f=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype.addCheckbox=function(t,e,i){void 0===e&&(e=function(t){}),void 0===i&&(i=!1);i=i||!1;var r=new h.Checkbox;r.width="20px",r.height="20px",r.color="#364249",r.background="#CCCCCC",r.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,r.onIsCheckedChangedObservable.add(function(t){e(t)});var o=s.Control.AddHeader(r,t,"200px",{isHorizontal:!0,controlFirst:!0});o.height="30px",o.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,o.left="4px",this.groupPanel.addControl(o),this.selectors.push(o),r.isChecked=i,this.groupPanel.parent&&this.groupPanel.parent.parent&&(r.color=this.groupPanel.parent.parent.buttonColor,r.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[1].text=e},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[0].background=e},e}(_);e.CheckboxGroup=f;var p=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._selectNb=0,e}return r(e,t),e.prototype.addRadio=function(t,e,i){void 0===e&&(e=function(t){}),void 0===i&&(i=!1);var r=this._selectNb++,o=new l.RadioButton;o.name=t,o.width="20px",o.height="20px",o.color="#364249",o.background="#CCCCCC",o.group=this.name,o.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,o.onIsCheckedChangedObservable.add(function(t){t&&e(r)});var n=s.Control.AddHeader(o,t,"200px",{isHorizontal:!0,controlFirst:!0});n.height="30px",n.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,n.left="4px",this.groupPanel.addControl(n),this.selectors.push(n),o.isChecked=i,this.groupPanel.parent&&this.groupPanel.parent.parent&&(o.color=this.groupPanel.parent.parent.buttonColor,o.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[1].text=e},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[0].background=e},e}(_);e.RadioGroup=p;var d=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype.addSlider=function(t,e,i,r,o,n,a){void 0===e&&(e=function(t){}),void 0===i&&(i="Units"),void 0===r&&(r=0),void 0===o&&(o=0),void 0===n&&(n=0),void 0===a&&(a=function(t){return 0|t});var h=new u.Slider;h.name=i,h.value=n,h.minimum=r,h.maximum=o,h.width=.9,h.height="20px",h.color="#364249",h.background="#CCCCCC",h.borderColor="black",h.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,h.left="4px",h.paddingBottom="4px",h.onValueChangedObservable.add(function(t){h.parent.children[0].text=h.parent.children[0].name+": "+a(t)+" "+h.name,e(t)});var l=s.Control.AddHeader(h,t+": "+a(n)+" "+i,"30px",{isHorizontal:!1,controlFirst:!1});l.height="60px",l.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,l.left="4px",l.children[0].name=t,this.groupPanel.addControl(l),this.selectors.push(l),this.groupPanel.parent&&this.groupPanel.parent.parent&&(h.color=this.groupPanel.parent.parent.buttonColor,h.background=this.groupPanel.parent.parent.buttonBackground)},e.prototype._setSelectorLabel=function(t,e){this.selectors[t].children[0].name=e,this.selectors[t].children[0].text=e+": "+this.selectors[t].children[1].value+" "+this.selectors[t].children[1].name},e.prototype._setSelectorLabelColor=function(t,e){this.selectors[t].children[0].color=e},e.prototype._setSelectorButtonColor=function(t,e){this.selectors[t].children[1].color=e},e.prototype._setSelectorButtonBackground=function(t,e){this.selectors[t].children[1].background=e},e}(_);e.SliderGroup=d;var y=function(t){function e(e,i){void 0===i&&(i=[]);var r=t.call(this,e)||this;if(r.name=e,r.groups=i,r._buttonColor="#364249",r._buttonBackground="#CCCCCC",r._headerColor="black",r._barColor="white",r._barHeight="2px",r._spacerHeight="20px",r._bars=new Array,r._groups=i,r.thickness=2,r._panel=new n.StackPanel,r._panel.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_TOP,r._panel.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,r._panel.top=5,r._panel.left=5,r._panel.width=.95,i.length>0){for(var o=0;o<i.length-1;o++)r._panel.addControl(i[o].groupPanel),r._addSpacer();r._panel.addControl(i[i.length-1].groupPanel)}return r.addControl(r._panel),r}return r(e,t),e.prototype._getTypeName=function(){return"SelectionPanel"},Object.defineProperty(e.prototype,"headerColor",{get:function(){return this._headerColor},set:function(t){this._headerColor!==t&&(this._headerColor=t,this._setHeaderColor())},enumerable:!0,configurable:!0}),e.prototype._setHeaderColor=function(){for(var t=0;t<this._groups.length;t++)this._groups[t].groupPanel.children[0].color=this._headerColor},Object.defineProperty(e.prototype,"buttonColor",{get:function(){return this._buttonColor},set:function(t){this._buttonColor!==t&&(this._buttonColor=t,this._setbuttonColor())},enumerable:!0,configurable:!0}),e.prototype._setbuttonColor=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorButtonColor(e,this._buttonColor)},Object.defineProperty(e.prototype,"labelColor",{get:function(){return this._labelColor},set:function(t){this._labelColor!==t&&(this._labelColor=t,this._setLabelColor())},enumerable:!0,configurable:!0}),e.prototype._setLabelColor=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorLabelColor(e,this._labelColor)},Object.defineProperty(e.prototype,"buttonBackground",{get:function(){return this._buttonBackground},set:function(t){this._buttonBackground!==t&&(this._buttonBackground=t,this._setButtonBackground())},enumerable:!0,configurable:!0}),e.prototype._setButtonBackground=function(){for(var t=0;t<this._groups.length;t++)for(var e=0;e<this._groups[t].selectors.length;e++)this._groups[t]._setSelectorButtonBackground(e,this._buttonBackground)},Object.defineProperty(e.prototype,"barColor",{get:function(){return this._barColor},set:function(t){this._barColor!==t&&(this._barColor=t,this._setBarColor())},enumerable:!0,configurable:!0}),e.prototype._setBarColor=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].children[0].background=this._barColor},Object.defineProperty(e.prototype,"barHeight",{get:function(){return this._barHeight},set:function(t){this._barHeight!==t&&(this._barHeight=t,this._setBarHeight())},enumerable:!0,configurable:!0}),e.prototype._setBarHeight=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].children[0].height=this._barHeight},Object.defineProperty(e.prototype,"spacerHeight",{get:function(){return this._spacerHeight},set:function(t){this._spacerHeight!==t&&(this._spacerHeight=t,this._setSpacerHeight())},enumerable:!0,configurable:!0}),e.prototype._setSpacerHeight=function(){for(var t=0;t<this._bars.length;t++)this._bars[t].height=this._spacerHeight},e.prototype._addSpacer=function(){var t=new c.Container;t.width=1,t.height=this._spacerHeight,t.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT;var e=new o.Rectangle;e.width=1,e.height=this._barHeight,e.horizontalAlignment=s.Control.HORIZONTAL_ALIGNMENT_LEFT,e.verticalAlignment=s.Control.VERTICAL_ALIGNMENT_CENTER,e.background=this._barColor,e.color="transparent",t.addControl(e),this._panel.addControl(t),this._bars.push(t)},e.prototype.addGroup=function(t){this._groups.length>0&&this._addSpacer(),this._panel.addControl(t.groupPanel),this._groups.push(t),t.groupPanel.children[0].color=this._headerColor;for(var e=0;e<t.selectors.length;e++)t._setSelectorButtonColor(e,this._buttonColor),t._setSelectorButtonBackground(e,this._buttonBackground)},e.prototype.removeGroup=function(t){if(!(t<0||t>=this._groups.length)){var e=this._groups[t];this._panel.removeControl(e.groupPanel),this._groups.splice(t,1),t<this._bars.length&&(this._panel.removeControl(this._bars[t]),this._bars.splice(t,1))}},e.prototype.setHeaderName=function(t,e){e<0||e>=this._groups.length||(this._groups[e].groupPanel.children[0].text=t)},e.prototype.relabel=function(t,e,i){if(!(e<0||e>=this._groups.length)){var r=this._groups[e];i<0||i>=r.selectors.length||r._setSelectorLabel(i,t)}},e.prototype.removeFromGroupSelector=function(t,e){if(!(t<0||t>=this._groups.length)){var i=this._groups[t];e<0||e>=i.selectors.length||i.removeSelector(e)}},e.prototype.addToGroupCheckbox=function(t,e,i,r){(void 0===i&&(i=function(){}),void 0===r&&(r=!1),t<0||t>=this._groups.length)||this._groups[t].addCheckbox(e,i,r)},e.prototype.addToGroupRadio=function(t,e,i,r){(void 0===i&&(i=function(){}),void 0===r&&(r=!1),t<0||t>=this._groups.length)||this._groups[t].addRadio(e,i,r)},e.prototype.addToGroupSlider=function(t,e,i,r,o,n,s,a){(void 0===i&&(i=function(){}),void 0===r&&(r="Units"),void 0===o&&(o=0),void 0===n&&(n=0),void 0===s&&(s=0),void 0===a&&(a=function(t){return 0|t}),t<0||t>=this._groups.length)||this._groups[t].addSlider(e,i,r,o,n,s,a)},e}(o.Rectangle);e.SelectionPanel=y},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(6),n=i(0),s=i(16),a=function(){return function(){}}();e.KeyPropertySet=a;var h=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e.onKeyPressObservable=new n.Observable,e.defaultButtonWidth="40px",e.defaultButtonHeight="40px",e.defaultButtonPaddingLeft="2px",e.defaultButtonPaddingRight="2px",e.defaultButtonPaddingTop="2px",e.defaultButtonPaddingBottom="2px",e.defaultButtonColor="#DDD",e.defaultButtonBackground="#070707",e.shiftButtonColor="#7799FF",e.selectedShiftThickness=1,e.shiftState=0,e._currentlyConnectedInputText=null,e._connectedInputTexts=[],e._onKeyPressObserver=null,e}return r(e,t),e.prototype._getTypeName=function(){return"VirtualKeyboard"},e.prototype._createKey=function(t,e){var i=this,r=s.Button.CreateSimpleButton(t,t);return r.width=e&&e.width?e.width:this.defaultButtonWidth,r.height=e&&e.height?e.height:this.defaultButtonHeight,r.color=e&&e.color?e.color:this.defaultButtonColor,r.background=e&&e.background?e.background:this.defaultButtonBackground,r.paddingLeft=e&&e.paddingLeft?e.paddingLeft:this.defaultButtonPaddingLeft,r.paddingRight=e&&e.paddingRight?e.paddingRight:this.defaultButtonPaddingRight,r.paddingTop=e&&e.paddingTop?e.paddingTop:this.defaultButtonPaddingTop,r.paddingBottom=e&&e.paddingBottom?e.paddingBottom:this.defaultButtonPaddingBottom,r.thickness=0,r.isFocusInvisible=!0,r.shadowColor=this.shadowColor,r.shadowBlur=this.shadowBlur,r.shadowOffsetX=this.shadowOffsetX,r.shadowOffsetY=this.shadowOffsetY,r.onPointerUpObservable.add(function(){i.onKeyPressObservable.notifyObservers(t)}),r},e.prototype.addKeysRow=function(t,e){var i=new o.StackPanel;i.isVertical=!1,i.isFocusInvisible=!0;for(var r=0;r<t.length;r++){var n=null;e&&e.length===t.length&&(n=e[r]),i.addControl(this._createKey(t[r],n))}this.addControl(i)},e.prototype.applyShiftState=function(t){if(this.children)for(var e=0;e<this.children.length;e++){var i=this.children[e];if(i&&i.children)for(var r=i,o=0;o<r.children.length;o++){var n=r.children[o];if(n&&n.children[0]){var s=n.children[0];"⇧"===s.text&&(n.color=t?this.shiftButtonColor:this.defaultButtonColor,n.thickness=t>1?this.selectedShiftThickness:0),s.text=t>0?s.text.toUpperCase():s.text.toLowerCase()}}}},Object.defineProperty(e.prototype,"connectedInputText",{get:function(){return this._currentlyConnectedInputText},enumerable:!0,configurable:!0}),e.prototype.connect=function(t){var e=this;if(!this._connectedInputTexts.some(function(e){return e.input===t})){null===this._onKeyPressObserver&&(this._onKeyPressObserver=this.onKeyPressObservable.add(function(t){if(e._currentlyConnectedInputText){switch(e._currentlyConnectedInputText._host.focusedControl=e._currentlyConnectedInputText,t){case"⇧":return e.shiftState++,e.shiftState>2&&(e.shiftState=0),void e.applyShiftState(e.shiftState);case"←":return void e._currentlyConnectedInputText.processKey(8);case"↵":return void e._currentlyConnectedInputText.processKey(13)}e._currentlyConnectedInputText.processKey(-1,e.shiftState?t.toUpperCase():t),1===e.shiftState&&(e.shiftState=0,e.applyShiftState(e.shiftState))}})),this.isVisible=!1,this._currentlyConnectedInputText=t,t._connectedVirtualKeyboard=this;var i=t.onFocusObservable.add(function(){e._currentlyConnectedInputText=t,t._connectedVirtualKeyboard=e,e.isVisible=!0}),r=t.onBlurObservable.add(function(){t._connectedVirtualKeyboard=null,e._currentlyConnectedInputText=null,e.isVisible=!1});this._connectedInputTexts.push({input:t,onBlurObserver:r,onFocusObserver:i})}},e.prototype.disconnect=function(t){var e=this;if(t){var i=this._connectedInputTexts.filter(function(e){return e.input===t});1===i.length&&(this._removeConnectedInputObservables(i[0]),this._connectedInputTexts=this._connectedInputTexts.filter(function(e){return e.input!==t}),this._currentlyConnectedInputText===t&&(this._currentlyConnectedInputText=null))}else this._connectedInputTexts.forEach(function(t){e._removeConnectedInputObservables(t)}),this._connectedInputTexts=[];0===this._connectedInputTexts.length&&(this._currentlyConnectedInputText=null,this.onKeyPressObservable.remove(this._onKeyPressObserver),this._onKeyPressObserver=null)},e.prototype._removeConnectedInputObservables=function(t){t.input._connectedVirtualKeyboard=null,t.input.onFocusObservable.remove(t.onFocusObserver),t.input.onBlurObservable.remove(t.onBlurObserver)},e.prototype.dispose=function(){t.prototype.dispose.call(this),this.disconnect()},e.CreateDefaultLayout=function(t){var i=new e(t);return i.addKeysRow(["1","2","3","4","5","6","7","8","9","0","←"]),i.addKeysRow(["q","w","e","r","t","y","u","i","o","p"]),i.addKeysRow(["a","s","d","f","g","h","j","k","l",";","'","↵"]),i.addKeysRow(["⇧","z","x","c","v","b","n","m",",",".","/"]),i.addKeysRow([" "],[{width:"200px"}]),i},e}(o.StackPanel);e.VirtualKeyboard=h},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e){var i=t.call(this,e)||this;return i.name=e,i._cellWidth=20,i._cellHeight=20,i._minorLineTickness=1,i._minorLineColor="DarkGray",i._majorLineTickness=2,i._majorLineColor="White",i._majorLineFrequency=5,i._background="Black",i._displayMajorLines=!0,i._displayMinorLines=!0,i}return r(e,t),Object.defineProperty(e.prototype,"displayMinorLines",{get:function(){return this._displayMinorLines},set:function(t){this._displayMinorLines!==t&&(this._displayMinorLines=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"displayMajorLines",{get:function(){return this._displayMajorLines},set:function(t){this._displayMajorLines!==t&&(this._displayMajorLines=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"background",{get:function(){return this._background},set:function(t){this._background!==t&&(this._background=t,this._markAsDirty())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellWidth",{get:function(){return this._cellWidth},set:function(t){this._cellWidth=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"cellHeight",{get:function(){return this._cellHeight},set:function(t){this._cellHeight=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minorLineTickness",{get:function(){return this._minorLineTickness},set:function(t){this._minorLineTickness=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"minorLineColor",{get:function(){return this._minorLineColor},set:function(t){this._minorLineColor=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineTickness",{get:function(){return this._majorLineTickness},set:function(t){this._majorLineTickness=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineColor",{get:function(){return this._majorLineColor},set:function(t){this._majorLineColor=t,this._markAsDirty()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"majorLineFrequency",{get:function(){return this._majorLineFrequency},set:function(t){this._majorLineFrequency=t,this._markAsDirty()},enumerable:!0,configurable:!0}),e.prototype._draw=function(t,e){if(e.save(),this._applyStates(e),this._isEnabled&&this._processMeasures(t,e)){this._background&&(e.fillStyle=this._background,e.fillRect(this._currentMeasure.left,this._currentMeasure.top,this._currentMeasure.width,this._currentMeasure.height));var i=this._currentMeasure.width/this._cellWidth,r=this._currentMeasure.height/this._cellHeight,o=this._currentMeasure.left+this._currentMeasure.width/2,n=this._currentMeasure.top+this._currentMeasure.height/2;if(this._displayMinorLines){e.strokeStyle=this._minorLineColor,e.lineWidth=this._minorLineTickness;for(var s=-i/2;s<i/2;s++){var a=o+s*this.cellWidth;e.beginPath(),e.moveTo(a,this._currentMeasure.top),e.lineTo(a,this._currentMeasure.top+this._currentMeasure.height),e.stroke()}for(var h=-r/2;h<r/2;h++){var l=n+h*this.cellHeight;e.beginPath(),e.moveTo(this._currentMeasure.left,l),e.lineTo(this._currentMeasure.left+this._currentMeasure.width,l),e.stroke()}}if(this._displayMajorLines){e.strokeStyle=this._majorLineColor,e.lineWidth=this._majorLineTickness;for(s=-i/2+this._majorLineFrequency;s<i/2;s+=this._majorLineFrequency){a=o+s*this.cellWidth;e.beginPath(),e.moveTo(a,this._currentMeasure.top),e.lineTo(a,this._currentMeasure.top+this._currentMeasure.height),e.stroke()}for(h=-r/2+this._majorLineFrequency;h<r/2;h+=this._majorLineFrequency){l=n+h*this.cellHeight;e.moveTo(this._currentMeasure.left,l),e.lineTo(this._currentMeasure.left+this._currentMeasure.width,l),e.closePath(),e.stroke()}}}e.restore()},e.prototype._getTypeName=function(){return"DisplayGrid"},e}(i(9).Control);e.DisplayGrid=o},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(1),o=i(6),n=i(5);e.name="Statics",r.Control.AddHeader=function(t,e,i,s){var a=new o.StackPanel("panel"),h=!s||s.isHorizontal,l=!s||s.controlFirst;a.isVertical=!h;var u=new n.TextBlock("header");return u.text=e,u.textHorizontalAlignment=r.Control.HORIZONTAL_ALIGNMENT_LEFT,h?u.width=i:u.height=i,l?(a.addControl(t),a.addControl(u),u.paddingLeft="5px"):(a.addControl(u),a.addControl(t),u.paddingRight="5px"),u.shadowBlur=t.shadowBlur,u.shadowColor=t.shadowColor,u.shadowOffsetX=t.shadowOffsetX,u.shadowOffsetY=t.shadowOffsetY,a}},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(41)),r(i(52)),r(i(53)),r(i(25))},function(t,e,i){"use strict";function r(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}Object.defineProperty(e,"__esModule",{value:!0}),r(i(24)),r(i(14)),r(i(3)),r(i(13)),r(i(42)),r(i(43)),r(i(47)),r(i(48)),r(i(49)),r(i(50)),r(i(51)),r(i(8))},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._radius=5,e}return r(e,t),Object.defineProperty(e.prototype,"radius",{get:function(){return this._radius},set:function(t){var e=this;this._radius!==t&&(this._radius=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){var r=this._cylindricalMapping(e);switch(t.position=r,this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:i.lookAt(new BABYLON.Vector3(-r.x,r.y,-r.z));break;case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new BABYLON.Vector3(2*r.x,r.y,2*r.z));break;case s.Container3D.FACEFORWARD_ORIENTATION:break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:i.rotate(BABYLON.Axis.Y,Math.PI,BABYLON.Space.LOCAL)}}},e.prototype._cylindricalMapping=function(t){var e=new n.Vector3(0,t.y,this._radius),i=t.x/this._radius;return n.Matrix.RotationYawPitchRollToRef(i,0,0,n.Tmp.Matrix[0]),n.Vector3.TransformNormal(e,n.Tmp.Matrix[0])},e}(o.VolumeBasedPanel);e.CylinderPanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(14),n=i(0),s=i(26),a=i(6),h=i(11),l=i(5),u=i(12),c=function(t){function e(e,i){void 0===i&&(i=!0);var r=t.call(this,e)||this;return r._shareMaterials=!0,r._shareMaterials=i,r.pointerEnterAnimation=function(){r.mesh&&r._frontPlate.setEnabled(!0)},r.pointerOutAnimation=function(){r.mesh&&r._frontPlate.setEnabled(!1)},r}return r(e,t),e.prototype._disposeTooltip=function(){this._tooltipFade=null,this._tooltipTextBlock&&this._tooltipTextBlock.dispose(),this._tooltipTexture&&this._tooltipTexture.dispose(),this._tooltipMesh&&this._tooltipMesh.dispose(),this.onPointerEnterObservable.remove(this._tooltipHoverObserver),this.onPointerOutObservable.remove(this._tooltipOutObserver)},Object.defineProperty(e.prototype,"tooltipText",{get:function(){return this._tooltipTextBlock?this._tooltipTextBlock.text:null},set:function(t){var e=this;if(t){if(!this._tooltipFade){this._tooltipMesh=BABYLON.MeshBuilder.CreatePlane("",{size:1},this._backPlate._scene);var i=BABYLON.MeshBuilder.CreatePlane("",{size:1,sideOrientation:BABYLON.Mesh.DOUBLESIDE},this._backPlate._scene),r=new n.StandardMaterial("",this._backPlate._scene);r.diffuseColor=BABYLON.Color3.FromHexString("#212121"),i.material=r,i.isPickable=!1,this._tooltipMesh.addChild(i),i.position.z=.05,this._tooltipMesh.scaling.y=1/3,this._tooltipMesh.position.y=.7,this._tooltipMesh.position.z=-.15,this._tooltipMesh.isPickable=!1,this._tooltipMesh.parent=this._backPlate,this._tooltipTexture=u.AdvancedDynamicTexture.CreateForMesh(this._tooltipMesh),this._tooltipTextBlock=new l.TextBlock,this._tooltipTextBlock.scaleY=3,this._tooltipTextBlock.color="white",this._tooltipTextBlock.fontSize=130,this._tooltipTexture.addControl(this._tooltipTextBlock),this._tooltipFade=new BABYLON.FadeInOutBehavior,this._tooltipFade.delay=500,this._tooltipMesh.addBehavior(this._tooltipFade),this._tooltipHoverObserver=this.onPointerEnterObservable.add(function(){e._tooltipFade&&e._tooltipFade.fadeIn(!0)}),this._tooltipOutObserver=this.onPointerOutObservable.add(function(){e._tooltipFade&&e._tooltipFade.fadeIn(!1)})}this._tooltipTextBlock&&(this._tooltipTextBlock.text=t)}else this._disposeTooltip()},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"text",{get:function(){return this._text},set:function(t){this._text!==t&&(this._text=t,this._rebuildContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"imageUrl",{get:function(){return this._imageUrl},set:function(t){this._imageUrl!==t&&(this._imageUrl=t,this._rebuildContent())},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"backMaterial",{get:function(){return this._backMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"frontMaterial",{get:function(){return this._frontMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"plateMaterial",{get:function(){return this._plateMaterial},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"shareMaterials",{get:function(){return this._shareMaterials},enumerable:!0,configurable:!0}),e.prototype._getTypeName=function(){return"HolographicButton"},e.prototype._rebuildContent=function(){this._disposeFacadeTexture();var t=new a.StackPanel;if(t.isVertical=!0,this._imageUrl){var e=new h.Image;e.source=this._imageUrl,e.paddingTop="40px",e.height="180px",e.width="100px",e.paddingBottom="40px",t.addControl(e)}if(this._text){var i=new l.TextBlock;i.text=this._text,i.color="white",i.height="30px",i.fontSize=24,t.addControl(i)}this._frontPlate&&(this.content=t)},e.prototype._createNode=function(e){return this._backPlate=n.MeshBuilder.CreateBox(this.name+"BackMesh",{width:1,height:1,depth:.08},e),this._frontPlate=n.MeshBuilder.CreateBox(this.name+"FrontMesh",{width:1,height:1,depth:.08},e),this._frontPlate.parent=this._backPlate,this._frontPlate.position.z=-.08,this._frontPlate.isPickable=!1,this._frontPlate.setEnabled(!1),this._textPlate=t.prototype._createNode.call(this,e),this._textPlate.parent=this._backPlate,this._textPlate.position.z=-.08,this._textPlate.isPickable=!1,this._backPlate},e.prototype._applyFacade=function(t){this._plateMaterial.emissiveTexture=t,this._plateMaterial.opacityTexture=t},e.prototype._createBackMaterial=function(t){var e=this;this._backMaterial=new s.FluentMaterial(this.name+"Back Material",t.getScene()),this._backMaterial.renderHoverLight=!0,this._pickedPointObserver=this._host.onPickedPointChangedObservable.add(function(t){t?(e._backMaterial.hoverPosition=t,e._backMaterial.hoverColor.a=1):e._backMaterial.hoverColor.a=0})},e.prototype._createFrontMaterial=function(t){this._frontMaterial=new s.FluentMaterial(this.name+"Front Material",t.getScene()),this._frontMaterial.innerGlowColorIntensity=0,this._frontMaterial.alpha=.5,this._frontMaterial.renderBorders=!0},e.prototype._createPlateMaterial=function(t){this._plateMaterial=new n.StandardMaterial(this.name+"Plate Material",t.getScene()),this._plateMaterial.specularColor=n.Color3.Black()},e.prototype._affectMaterial=function(t){this._shareMaterials?(this._host._sharedMaterials.backFluentMaterial?this._backMaterial=this._host._sharedMaterials.backFluentMaterial:(this._createBackMaterial(t),this._host._sharedMaterials.backFluentMaterial=this._backMaterial),this._host._sharedMaterials.frontFluentMaterial?this._frontMaterial=this._host._sharedMaterials.frontFluentMaterial:(this._createFrontMaterial(t),this._host._sharedMaterials.frontFluentMaterial=this._frontMaterial)):(this._createBackMaterial(t),this._createFrontMaterial(t)),this._createPlateMaterial(t),this._backPlate.material=this._backMaterial,this._frontPlate.material=this._frontMaterial,this._textPlate.material=this._plateMaterial,this._rebuildContent()},e.prototype.dispose=function(){t.prototype.dispose.call(this),this._disposeTooltip(),this.shareMaterials||(this._backMaterial.dispose(),this._frontMaterial.dispose(),this._plateMaterial.dispose(),this._pickedPointObserver&&(this._host.onPickedPointChangedObservable.remove(this._pickedPointObserver),this._pickedPointObserver=null))},e}(o.Button3D);e.HolographicButton=c},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(45);e.fShader=o;var n=i(46);e.vShader=n,e.registerShader=function(){r.Effect.ShadersStore.fluentVertexShader=n,r.Effect.ShadersStore.fluentPixelShader=o}},function(t,e){t.exports="precision highp float;\nvarying vec2 vUV;\nuniform vec4 albedoColor;\n#ifdef INNERGLOW\nuniform vec4 innerGlowColor;\n#endif\n#ifdef BORDER\nvarying vec2 scaleInfo;\nuniform float edgeSmoothingValue;\nuniform float borderMinValue;\n#endif\n#ifdef HOVERLIGHT\nvarying vec3 worldPosition;\nuniform vec3 hoverPosition;\nuniform vec4 hoverColor;\nuniform float hoverRadius;\n#endif\n#ifdef TEXTURE\nuniform sampler2D albedoSampler;\n#endif\nvoid main(void) {\nvec3 albedo=albedoColor.rgb;\nfloat alpha=albedoColor.a;\n#ifdef TEXTURE\nalbedo=texture2D(albedoSampler,vUV).rgb;\n#endif\n#ifdef HOVERLIGHT\nfloat pointToHover=(1.0-clamp(length(hoverPosition-worldPosition)/hoverRadius,0.,1.))*hoverColor.a;\nalbedo=clamp(albedo+hoverColor.rgb*pointToHover,0.,1.);\n#else\nfloat pointToHover=1.0;\n#endif\n#ifdef BORDER \nfloat borderPower=10.0;\nfloat inverseBorderPower=1.0/borderPower;\nvec3 borderColor=albedo*borderPower;\nvec2 distanceToEdge;\ndistanceToEdge.x=abs(vUV.x-0.5)*2.0;\ndistanceToEdge.y=abs(vUV.y-0.5)*2.0;\nfloat borderValue=max(smoothstep(scaleInfo.x-edgeSmoothingValue,scaleInfo.x+edgeSmoothingValue,distanceToEdge.x),\nsmoothstep(scaleInfo.y-edgeSmoothingValue,scaleInfo.y+edgeSmoothingValue,distanceToEdge.y));\nborderColor=borderColor*borderValue*max(borderMinValue*inverseBorderPower,pointToHover); \nalbedo+=borderColor;\nalpha=max(alpha,borderValue);\n#endif\n#ifdef INNERGLOW\n\nvec2 uvGlow=(vUV-vec2(0.5,0.5))*(innerGlowColor.a*2.0);\nuvGlow=uvGlow*uvGlow;\nuvGlow=uvGlow*uvGlow;\nalbedo+=mix(vec3(0.0,0.0,0.0),innerGlowColor.rgb,uvGlow.x+uvGlow.y); \n#endif\ngl_FragColor=vec4(albedo,alpha);\n}"},function(t,e){t.exports="precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\nattribute vec2 uv;\n\nuniform mat4 world;\nuniform mat4 viewProjection;\nvarying vec2 vUV;\n#ifdef BORDER\nvarying vec2 scaleInfo;\nuniform float borderWidth;\nuniform vec3 scaleFactor;\n#endif\n#ifdef HOVERLIGHT\nvarying vec3 worldPosition;\n#endif\nvoid main(void) {\nvUV=uv;\n#ifdef BORDER\nvec3 scale=scaleFactor;\nfloat minScale=min(min(scale.x,scale.y),scale.z);\nfloat maxScale=max(max(scale.x,scale.y),scale.z);\nfloat minOverMiddleScale=minScale/(scale.x+scale.y+scale.z-minScale-maxScale);\nfloat areaYZ=scale.y*scale.z;\nfloat areaXZ=scale.x*scale.z;\nfloat areaXY=scale.x*scale.y;\nfloat scaledBorderWidth=borderWidth; \nif (abs(normal.x) == 1.0) \n{\nscale.x=scale.y;\nscale.y=scale.z;\nif (areaYZ>areaXZ && areaYZ>areaXY)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nelse if (abs(normal.y) == 1.0) \n{\nscale.x=scale.z;\nif (areaXZ>areaXY && areaXZ>areaYZ)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nelse \n{\nif (areaXY>areaYZ && areaXY>areaXZ)\n{\nscaledBorderWidth*=minOverMiddleScale;\n}\n}\nfloat scaleRatio=min(scale.x,scale.y)/max(scale.x,scale.y);\nif (scale.x>scale.y)\n{\nscaleInfo.x=1.0-(scaledBorderWidth*scaleRatio);\nscaleInfo.y=1.0-scaledBorderWidth;\n}\nelse\n{\nscaleInfo.x=1.0-scaledBorderWidth;\nscaleInfo.y=1.0-(scaledBorderWidth*scaleRatio);\n} \n#endif \nvec4 worldPos=world*vec4(position,1.0);\n#ifdef HOVERLIGHT\nworldPosition=worldPos.xyz;\n#endif\ngl_Position=viewProjection*worldPos;\n}\n"},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=function(t){function e(e,i){var r=t.call(this,i)||this;return r._currentMesh=e,r.pointerEnterAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1.1)},r.pointerOutAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1/1.1)},r.pointerDownAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(.95)},r.pointerUpAnimation=function(){r.mesh&&r.mesh.scaling.scaleInPlace(1/.95)},r}return r(e,t),e.prototype._getTypeName=function(){return"MeshButton3D"},e.prototype._createNode=function(t){var e=this;return this._currentMesh.getChildMeshes().forEach(function(t){t.metadata=e}),this._currentMesh},e.prototype._affectMaterial=function(t){},e}(i(14).Button3D);e.MeshButton3D=o},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(0),n=i(3),s=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r(e,t),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){t.position=e.clone();var r=o.Tmp.Vector3[0];switch(r.copyFrom(e),this.orientation){case n.Container3D.FACEORIGIN_ORIENTATION:case n.Container3D.FACEFORWARD_ORIENTATION:r.addInPlace(new BABYLON.Vector3(0,0,-1)),i.lookAt(r);break;case n.Container3D.FACEFORWARDREVERSED_ORIENTATION:case n.Container3D.FACEORIGINREVERSED_ORIENTATION:r.addInPlace(new BABYLON.Vector3(0,0,1)),i.lookAt(r)}}},e}(i(8).VolumeBasedPanel);e.PlanePanel=s},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._iteration=100,e}return r(e,t),Object.defineProperty(e.prototype,"iteration",{get:function(){return this._iteration},set:function(t){var e=this;this._iteration!==t&&(this._iteration=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh,r=this._scatterMapping(e);if(i){switch(this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:case s.Container3D.FACEFORWARD_ORIENTATION:i.lookAt(new n.Vector3(0,0,-1));break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new n.Vector3(0,0,1))}t.position=r}},e.prototype._scatterMapping=function(t){return t.x=(1-2*Math.random())*this._cellWidth,t.y=(1-2*Math.random())*this._cellHeight,t},e.prototype._finalProcessing=function(){for(var t=[],e=0,i=this._children;e<i.length;e++){var r=i[e];r.mesh&&t.push(r.mesh)}for(var o=0;o<this._iteration;o++){t.sort(function(t,e){var i=t.position.lengthSquared(),r=e.position.lengthSquared();return i<r?1:i>r?-1:0});for(var s=Math.pow(this.margin,2),a=Math.max(this._cellWidth,this._cellHeight),h=n.Tmp.Vector2[0],l=n.Tmp.Vector3[0],u=0;u<t.length-1;u++)for(var c=u+1;c<t.length;c++)if(u!=c){t[c].position.subtractToRef(t[u].position,l),h.x=l.x,h.y=l.y;var _=a,f=h.lengthSquared()-s;(f-=Math.min(f,s))<Math.pow(_,2)&&(h.normalize(),l.scaleInPlace(.5*(_-Math.sqrt(f))),t[c].position.addInPlace(l),t[u].position.subtractInPlace(l))}}},e}(o.VolumeBasedPanel);e.ScatterPanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(8),n=i(0),s=i(3),a=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e._radius=5,e}return r(e,t),Object.defineProperty(e.prototype,"radius",{get:function(){return this._radius},set:function(t){var e=this;this._radius!==t&&(this._radius=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._mapGridNode=function(t,e){var i=t.mesh;if(i){var r=this._sphericalMapping(e);switch(t.position=r,this.orientation){case s.Container3D.FACEORIGIN_ORIENTATION:i.lookAt(new BABYLON.Vector3(-r.x,-r.y,-r.z));break;case s.Container3D.FACEORIGINREVERSED_ORIENTATION:i.lookAt(new BABYLON.Vector3(2*r.x,2*r.y,2*r.z));break;case s.Container3D.FACEFORWARD_ORIENTATION:break;case s.Container3D.FACEFORWARDREVERSED_ORIENTATION:i.rotate(BABYLON.Axis.Y,Math.PI,BABYLON.Space.LOCAL)}}},e.prototype._sphericalMapping=function(t){var e=new n.Vector3(0,0,this._radius),i=t.y/this._radius,r=-t.x/this._radius;return n.Matrix.RotationYawPitchRollToRef(r,i,0,n.Tmp.Matrix[0]),n.Vector3.TransformNormal(e,n.Tmp.Matrix[0])},e}(o.VolumeBasedPanel);e.SpherePanel=a},function(t,e,i){"use strict";var r=this&&this.__extends||function(){var t=function(e,i){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var i in e)e.hasOwnProperty(i)&&(t[i]=e[i])})(e,i)};return function(e,i){function r(){this.constructor=e}t(e,i),e.prototype=null===i?Object.create(i):(r.prototype=i.prototype,new r)}}();Object.defineProperty(e,"__esModule",{value:!0});var o=i(3),n=i(0),s=function(t){function e(e){void 0===e&&(e=!1);var i=t.call(this)||this;return i._isVertical=!1,i.margin=.1,i._isVertical=e,i}return r(e,t),Object.defineProperty(e.prototype,"isVertical",{get:function(){return this._isVertical},set:function(t){var e=this;this._isVertical!==t&&(this._isVertical=t,n.Tools.SetImmediate(function(){e._arrangeChildren()}))},enumerable:!0,configurable:!0}),e.prototype._arrangeChildren=function(){for(var t,e=0,i=0,r=0,o=[],s=n.Matrix.Invert(this.node.computeWorldMatrix(!0)),a=0,h=this._children;a<h.length;a++){if((p=h[a]).mesh){r++,p.mesh.computeWorldMatrix(!0),p.mesh.getWorldMatrix().multiplyToRef(s,n.Tmp.Matrix[0]);var l=p.mesh.getBoundingInfo().boundingBox,u=n.Vector3.TransformNormal(l.extendSize,n.Tmp.Matrix[0]);o.push(u),this._isVertical?i+=u.y:e+=u.x}}this._isVertical?i+=(r-1)*this.margin/2:e+=(r-1)*this.margin/2,t=this._isVertical?-i:-e;for(var c=0,_=0,f=this._children;_<f.length;_++){var p;if((p=f[_]).mesh){r--;u=o[c++];this._isVertical?(p.position.y=t+u.y,p.position.x=0,t+=2*u.y):(p.position.x=t+u.x,p.position.y=0,t+=2*u.x),t+=r>0?this.margin:0}}},e}(o.Container3D);e.StackPanel3D=s},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),function(t){for(var i in t)e.hasOwnProperty(i)||(e[i]=t[i])}(i(26))},function(t,e,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=i(0),o=i(3),n=function(){function t(t){var e=this;this._lastControlOver={},this._lastControlDown={},this.onPickedPointChangedObservable=new r.Observable,this._sharedMaterials={},this._scene=t||r.Engine.LastCreatedScene,this._sceneDisposeObserver=this._scene.onDisposeObservable.add(function(){e._sceneDisposeObserver=null,e._utilityLayer=null,e.dispose()}),this._utilityLayer=new r.UtilityLayerRenderer(this._scene),this._utilityLayer.onlyCheckPointerDownEvents=!1,this._utilityLayer.mainSceneTrackerPredicate=function(t){return t&&t.metadata&&t.metadata._node},this._rootContainer=new o.Container3D("RootContainer"),this._rootContainer._host=this;var i=this._utilityLayer.utilityLayerScene;this._pointerOutObserver=this._utilityLayer.onPointerOutObservable.add(function(t){e._handlePointerOut(t,!0)}),this._pointerObserver=i.onPointerObservable.add(function(t,i){e._doPicking(t)}),this._utilityLayer.utilityLayerScene.autoClear=!1,this._utilityLayer.utilityLayerScene.autoClearDepthAndStencil=!1,new r.HemisphericLight("hemi",r.Vector3.Up(),this._utilityLayer.utilityLayerScene)}return Object.defineProperty(t.prototype,"scene",{get:function(){return this._scene},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"utilityLayer",{get:function(){return this._utilityLayer},enumerable:!0,configurable:!0}),t.prototype._handlePointerOut=function(t,e){var i=this._lastControlOver[t];i&&(i._onPointerOut(i),delete this._lastControlOver[t]),e&&this._lastControlDown[t]&&(this._lastControlDown[t].forcePointerUp(),delete this._lastControlDown[t]),this.onPickedPointChangedObservable.notifyObservers(null)},t.prototype._doPicking=function(t){if(!this._utilityLayer||!this._utilityLayer.utilityLayerScene.activeCamera)return!1;var e=t.event,i=e.pointerId||0,o=e.button,n=t.pickInfo;if(!n||!n.hit)return this._handlePointerOut(i,t.type===r.PointerEventTypes.POINTERUP),!1;var s=n.pickedMesh.metadata;return n.pickedPoint&&this.onPickedPointChangedObservable.notifyObservers(n.pickedPoint),s._processObservables(t.type,n.pickedPoint,i,o)||t.type===r.PointerEventTypes.POINTERMOVE&&(this._lastControlOver[i]&&this._lastControlOver[i]._onPointerOut(this._lastControlOver[i]),delete this._lastControlOver[i]),t.type===r.PointerEventTypes.POINTERUP&&(this._lastControlDown[e.pointerId]&&(this._lastControlDown[e.pointerId].forcePointerUp(),delete this._lastControlDown[e.pointerId]),"touch"===e.pointerType&&this._handlePointerOut(i,!1)),!0},Object.defineProperty(t.prototype,"rootContainer",{get:function(){return this._rootContainer},enumerable:!0,configurable:!0}),t.prototype.containsControl=function(t){return this._rootContainer.containsControl(t)},t.prototype.addControl=function(t){return this._rootContainer.addControl(t),this},t.prototype.removeControl=function(t){return this._rootContainer.removeControl(t),this},t.prototype.dispose=function(){for(var t in this._rootContainer.dispose(),this._sharedMaterials)this._sharedMaterials.hasOwnProperty(t)&&this._sharedMaterials[t].dispose();this._sharedMaterials={},this._pointerOutObserver&&this._utilityLayer&&(this._utilityLayer.onPointerOutObservable.remove(this._pointerOutObserver),this._pointerOutObserver=null),this.onPickedPointChangedObservable.clear();var e=this._utilityLayer?this._utilityLayer.utilityLayerScene:null;e&&this._pointerObserver&&(e.onPointerObservable.remove(this._pointerObserver),this._pointerObserver=null),this._scene&&this._sceneDisposeObserver&&(this._scene.onDisposeObservable.remove(this._sceneDisposeObserver),this._sceneDisposeObserver=null),this._utilityLayer&&this._utilityLayer.dispose()},t}();e.GUI3DManager=n}])});
//# sourceMappingURL=babylon.gui.min.js.map

/// <reference path="../../../dist/preview release/babylon.d.ts"/>
/// <reference path="../../../dist/preview release/glTF2Interface/babylon.glTF2Interface.d.ts"/>
var BABYLON;
(function (BABYLON) {
    /**
     * Mode that determines the coordinate system to use.
     */
    var GLTFLoaderCoordinateSystemMode;
    (function (GLTFLoaderCoordinateSystemMode) {
        /**
         * Automatically convert the glTF right-handed data to the appropriate system based on the current coordinate system mode of the scene.
         */
        GLTFLoaderCoordinateSystemMode[GLTFLoaderCoordinateSystemMode["AUTO"] = 0] = "AUTO";
        /**
         * Sets the useRightHandedSystem flag on the scene.
         */
        GLTFLoaderCoordinateSystemMode[GLTFLoaderCoordinateSystemMode["FORCE_RIGHT_HANDED"] = 1] = "FORCE_RIGHT_HANDED";
    })(GLTFLoaderCoordinateSystemMode = BABYLON.GLTFLoaderCoordinateSystemMode || (BABYLON.GLTFLoaderCoordinateSystemMode = {}));
    /**
     * Mode that determines what animations will start.
     */
    var GLTFLoaderAnimationStartMode;
    (function (GLTFLoaderAnimationStartMode) {
        /**
         * No animation will start.
         */
        GLTFLoaderAnimationStartMode[GLTFLoaderAnimationStartMode["NONE"] = 0] = "NONE";
        /**
         * The first animation will start.
         */
        GLTFLoaderAnimationStartMode[GLTFLoaderAnimationStartMode["FIRST"] = 1] = "FIRST";
        /**
         * All animations will start.
         */
        GLTFLoaderAnimationStartMode[GLTFLoaderAnimationStartMode["ALL"] = 2] = "ALL";
    })(GLTFLoaderAnimationStartMode = BABYLON.GLTFLoaderAnimationStartMode || (BABYLON.GLTFLoaderAnimationStartMode = {}));
    /**
     * Loader state.
     */
    var GLTFLoaderState;
    (function (GLTFLoaderState) {
        /**
         * The asset is loading.
         */
        GLTFLoaderState[GLTFLoaderState["LOADING"] = 0] = "LOADING";
        /**
         * The asset is ready for rendering.
         */
        GLTFLoaderState[GLTFLoaderState["READY"] = 1] = "READY";
        /**
         * The asset is completely loaded.
         */
        GLTFLoaderState[GLTFLoaderState["COMPLETE"] = 2] = "COMPLETE";
    })(GLTFLoaderState = BABYLON.GLTFLoaderState || (BABYLON.GLTFLoaderState = {}));
    /**
     * File loader for loading glTF files into a scene.
     */
    var GLTFFileLoader = /** @class */ (function () {
        function GLTFFileLoader() {
            // --------------
            // Common options
            // --------------
            /**
             * Raised when the asset has been parsed
             */
            this.onParsedObservable = new BABYLON.Observable();
            // ----------
            // V2 options
            // ----------
            /**
             * The coordinate system mode. Defaults to AUTO.
             */
            this.coordinateSystemMode = GLTFLoaderCoordinateSystemMode.AUTO;
            /**
            * The animation start mode. Defaults to FIRST.
            */
            this.animationStartMode = GLTFLoaderAnimationStartMode.FIRST;
            /**
             * Defines if the loader should compile materials before raising the success callback. Defaults to false.
             */
            this.compileMaterials = false;
            /**
             * Defines if the loader should also compile materials with clip planes. Defaults to false.
             */
            this.useClipPlane = false;
            /**
             * Defines if the loader should compile shadow generators before raising the success callback. Defaults to false.
             */
            this.compileShadowGenerators = false;
            /**
             * Defines if the Alpha blended materials are only applied as coverage.
             * If false, (default) The luminance of each pixel will reduce its opacity to simulate the behaviour of most physical materials.
             * If true, no extra effects are applied to transparent pixels.
             */
            this.transparencyAsCoverage = false;
            /**
             * Function called before loading a url referenced by the asset.
             */
            this.preprocessUrlAsync = function (url) { return Promise.resolve(url); };
            /**
             * Observable raised when the loader creates a mesh after parsing the glTF properties of the mesh.
             */
            this.onMeshLoadedObservable = new BABYLON.Observable();
            /**
             * Observable raised when the loader creates a texture after parsing the glTF properties of the texture.
             */
            this.onTextureLoadedObservable = new BABYLON.Observable();
            /**
             * Observable raised when the loader creates a material after parsing the glTF properties of the material.
             */
            this.onMaterialLoadedObservable = new BABYLON.Observable();
            /**
             * Observable raised when the loader creates a camera after parsing the glTF properties of the camera.
             */
            this.onCameraLoadedObservable = new BABYLON.Observable();
            /**
             * Observable raised when the asset is completely loaded, immediately before the loader is disposed.
             * For assets with LODs, raised when all of the LODs are complete.
             * For assets without LODs, raised when the model is complete, immediately after the loader resolves the returned promise.
             */
            this.onCompleteObservable = new BABYLON.Observable();
            /**
             * Observable raised when an error occurs.
             */
            this.onErrorObservable = new BABYLON.Observable();
            /**
             * Observable raised after the loader is disposed.
             */
            this.onDisposeObservable = new BABYLON.Observable();
            /**
             * Observable raised after a loader extension is created.
             * Set additional options for a loader extension in this event.
             */
            this.onExtensionLoadedObservable = new BABYLON.Observable();
            /**
             * Defines if the loader should validate the asset.
             */
            this.validate = false;
            /**
             * Observable raised after validation when validate is set to true. The event data is the result of the validation.
             */
            this.onValidatedObservable = new BABYLON.Observable();
            this._loader = null;
            /**
             * Name of the loader ("gltf")
             */
            this.name = "gltf";
            /**
             * Supported file extensions of the loader (.gltf, .glb)
             */
            this.extensions = {
                ".gltf": { isBinary: false },
                ".glb": { isBinary: true }
            };
            this._logIndentLevel = 0;
            this._loggingEnabled = false;
            /** @hidden */
            this._log = this._logDisabled;
            this._capturePerformanceCounters = false;
            /** @hidden */
            this._startPerformanceCounter = this._startPerformanceCounterDisabled;
            /** @hidden */
            this._endPerformanceCounter = this._endPerformanceCounterDisabled;
        }
        Object.defineProperty(GLTFFileLoader.prototype, "onParsed", {
            /**
             * Raised when the asset has been parsed
             */
            set: function (callback) {
                if (this._onParsedObserver) {
                    this.onParsedObservable.remove(this._onParsedObserver);
                }
                this._onParsedObserver = this.onParsedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onMeshLoaded", {
            /**
             * Callback raised when the loader creates a mesh after parsing the glTF properties of the mesh.
             */
            set: function (callback) {
                if (this._onMeshLoadedObserver) {
                    this.onMeshLoadedObservable.remove(this._onMeshLoadedObserver);
                }
                this._onMeshLoadedObserver = this.onMeshLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onTextureLoaded", {
            /**
             * Callback raised when the loader creates a texture after parsing the glTF properties of the texture.
             */
            set: function (callback) {
                if (this._onTextureLoadedObserver) {
                    this.onTextureLoadedObservable.remove(this._onTextureLoadedObserver);
                }
                this._onTextureLoadedObserver = this.onTextureLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onMaterialLoaded", {
            /**
             * Callback raised when the loader creates a material after parsing the glTF properties of the material.
             */
            set: function (callback) {
                if (this._onMaterialLoadedObserver) {
                    this.onMaterialLoadedObservable.remove(this._onMaterialLoadedObserver);
                }
                this._onMaterialLoadedObserver = this.onMaterialLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onCameraLoaded", {
            /**
             * Callback raised when the loader creates a camera after parsing the glTF properties of the camera.
             */
            set: function (callback) {
                if (this._onCameraLoadedObserver) {
                    this.onCameraLoadedObservable.remove(this._onCameraLoadedObserver);
                }
                this._onCameraLoadedObserver = this.onCameraLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onComplete", {
            /**
             * Callback raised when the asset is completely loaded, immediately before the loader is disposed.
             * For assets with LODs, raised when all of the LODs are complete.
             * For assets without LODs, raised when the model is complete, immediately after the loader resolves the returned promise.
             */
            set: function (callback) {
                if (this._onCompleteObserver) {
                    this.onCompleteObservable.remove(this._onCompleteObserver);
                }
                this._onCompleteObserver = this.onCompleteObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onError", {
            /**
             * Callback raised when an error occurs.
             */
            set: function (callback) {
                if (this._onErrorObserver) {
                    this.onErrorObservable.remove(this._onErrorObserver);
                }
                this._onErrorObserver = this.onErrorObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onDispose", {
            /**
             * Callback raised after the loader is disposed.
             */
            set: function (callback) {
                if (this._onDisposeObserver) {
                    this.onDisposeObservable.remove(this._onDisposeObserver);
                }
                this._onDisposeObserver = this.onDisposeObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onExtensionLoaded", {
            /**
             * Callback raised after a loader extension is created.
             */
            set: function (callback) {
                if (this._onExtensionLoadedObserver) {
                    this.onExtensionLoadedObservable.remove(this._onExtensionLoadedObserver);
                }
                this._onExtensionLoadedObserver = this.onExtensionLoadedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "loggingEnabled", {
            /**
             * Defines if the loader logging is enabled.
             */
            get: function () {
                return this._loggingEnabled;
            },
            set: function (value) {
                if (this._loggingEnabled === value) {
                    return;
                }
                this._loggingEnabled = value;
                if (this._loggingEnabled) {
                    this._log = this._logEnabled;
                }
                else {
                    this._log = this._logDisabled;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "capturePerformanceCounters", {
            /**
             * Defines if the loader should capture performance counters.
             */
            get: function () {
                return this._capturePerformanceCounters;
            },
            set: function (value) {
                if (this._capturePerformanceCounters === value) {
                    return;
                }
                this._capturePerformanceCounters = value;
                if (this._capturePerformanceCounters) {
                    this._startPerformanceCounter = this._startPerformanceCounterEnabled;
                    this._endPerformanceCounter = this._endPerformanceCounterEnabled;
                }
                else {
                    this._startPerformanceCounter = this._startPerformanceCounterDisabled;
                    this._endPerformanceCounter = this._endPerformanceCounterDisabled;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GLTFFileLoader.prototype, "onValidated", {
            /**
             * Callback raised after a loader extension is created.
             */
            set: function (callback) {
                if (this._onValidatedObserver) {
                    this.onValidatedObservable.remove(this._onValidatedObserver);
                }
                this._onValidatedObserver = this.onValidatedObservable.add(callback);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Disposes the loader, releases resources during load, and cancels any outstanding requests.
         */
        GLTFFileLoader.prototype.dispose = function () {
            if (this._loader) {
                this._loader.dispose();
                this._loader = null;
            }
            this._clear();
            this.onDisposeObservable.notifyObservers(undefined);
            this.onDisposeObservable.clear();
        };
        /** @hidden */
        GLTFFileLoader.prototype._clear = function () {
            this.preprocessUrlAsync = function (url) { return Promise.resolve(url); };
            this.onMeshLoadedObservable.clear();
            this.onTextureLoadedObservable.clear();
            this.onMaterialLoadedObservable.clear();
            this.onCameraLoadedObservable.clear();
            this.onCompleteObservable.clear();
            this.onExtensionLoadedObservable.clear();
        };
        /**
         * Imports one or more meshes from the loaded glTF data and adds them to the scene
         * @param meshesNames a string or array of strings of the mesh names that should be loaded from the file
         * @param scene the scene the meshes should be added to
         * @param data the glTF data to load
         * @param rootUrl root url to load from
         * @param onProgress event that fires when loading progress has occured
         * @param fileName Defines the name of the file to load
         * @returns a promise containg the loaded meshes, particles, skeletons and animations
         */
        GLTFFileLoader.prototype.importMeshAsync = function (meshesNames, scene, data, rootUrl, onProgress, fileName) {
            var _this = this;
            return this._parseAsync(scene, data, rootUrl, fileName).then(function (loaderData) {
                _this._log("Loading " + (fileName || ""));
                _this._loader = _this._getLoader(loaderData);
                return _this._loader.importMeshAsync(meshesNames, scene, loaderData, rootUrl, onProgress, fileName);
            });
        };
        /**
         * Imports all objects from the loaded glTF data and adds them to the scene
         * @param scene the scene the objects should be added to
         * @param data the glTF data to load
         * @param rootUrl root url to load from
         * @param onProgress event that fires when loading progress has occured
         * @param fileName Defines the name of the file to load
         * @returns a promise which completes when objects have been loaded to the scene
         */
        GLTFFileLoader.prototype.loadAsync = function (scene, data, rootUrl, onProgress, fileName) {
            var _this = this;
            return this._parseAsync(scene, data, rootUrl, fileName).then(function (loaderData) {
                _this._log("Loading " + (fileName || ""));
                _this._loader = _this._getLoader(loaderData);
                return _this._loader.loadAsync(scene, loaderData, rootUrl, onProgress, fileName);
            });
        };
        /**
         * Load into an asset container.
         * @param scene The scene to load into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onProgress The callback when the load progresses
         * @param fileName Defines the name of the file to load
         * @returns The loaded asset container
         */
        GLTFFileLoader.prototype.loadAssetContainerAsync = function (scene, data, rootUrl, onProgress, fileName) {
            var _this = this;
            return this._parseAsync(scene, data, rootUrl, fileName).then(function (loaderData) {
                _this._log("Loading " + (fileName || ""));
                _this._loader = _this._getLoader(loaderData);
                return _this._loader.importMeshAsync(null, scene, loaderData, rootUrl, onProgress, fileName).then(function (result) {
                    var container = new BABYLON.AssetContainer(scene);
                    Array.prototype.push.apply(container.meshes, result.meshes);
                    Array.prototype.push.apply(container.particleSystems, result.particleSystems);
                    Array.prototype.push.apply(container.skeletons, result.skeletons);
                    Array.prototype.push.apply(container.animationGroups, result.animationGroups);
                    container.removeAllFromScene();
                    return container;
                });
            });
        };
        /**
         * If the data string can be loaded directly.
         * @param data string contianing the file data
         * @returns if the data can be loaded directly
         */
        GLTFFileLoader.prototype.canDirectLoad = function (data) {
            return ((data.indexOf("scene") !== -1) && (data.indexOf("node") !== -1));
        };
        /**
         * Instantiates a glTF file loader plugin.
         * @returns the created plugin
         */
        GLTFFileLoader.prototype.createPlugin = function () {
            return new GLTFFileLoader();
        };
        Object.defineProperty(GLTFFileLoader.prototype, "loaderState", {
            /**
             * The loader state or null if the loader is not active.
             */
            get: function () {
                return this._loader ? this._loader.state : null;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Returns a promise that resolves when the asset is completely loaded.
         * @returns a promise that resolves when the asset is completely loaded.
         */
        GLTFFileLoader.prototype.whenCompleteAsync = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.onCompleteObservable.addOnce(function () {
                    resolve();
                });
                _this.onErrorObservable.addOnce(function (reason) {
                    reject(reason);
                });
            });
        };
        GLTFFileLoader.prototype._parseAsync = function (scene, data, rootUrl, fileName) {
            var _this = this;
            return Promise.resolve().then(function () {
                var unpacked = (data instanceof ArrayBuffer) ? _this._unpackBinary(data) : { json: data, bin: null };
                return _this._validateAsync(scene, unpacked.json, rootUrl, fileName).then(function () {
                    _this._startPerformanceCounter("Parse JSON");
                    _this._log("JSON length: " + unpacked.json.length);
                    var loaderData = {
                        json: JSON.parse(unpacked.json),
                        bin: unpacked.bin
                    };
                    _this._endPerformanceCounter("Parse JSON");
                    _this.onParsedObservable.notifyObservers(loaderData);
                    _this.onParsedObservable.clear();
                    return loaderData;
                });
            });
        };
        GLTFFileLoader.prototype._validateAsync = function (scene, json, rootUrl, fileName) {
            var _this = this;
            if (!this.validate || typeof GLTFValidator === "undefined") {
                return Promise.resolve();
            }
            this._startPerformanceCounter("Validate JSON");
            var options = {
                externalResourceFunction: function (uri) {
                    return _this.preprocessUrlAsync(rootUrl + uri)
                        .then(function (url) { return scene._loadFileAsync(url, true, true); })
                        .then(function (data) { return new Uint8Array(data); });
                }
            };
            if (fileName && fileName.substr(0, 5) !== "data:") {
                options.uri = (rootUrl === "file:" ? fileName : "" + rootUrl + fileName);
            }
            return GLTFValidator.validateString(json, options).then(function (result) {
                _this._endPerformanceCounter("Validate JSON");
                _this.onValidatedObservable.notifyObservers(result);
                _this.onValidatedObservable.clear();
            });
        };
        GLTFFileLoader.prototype._getLoader = function (loaderData) {
            var asset = loaderData.json.asset || {};
            this._log("Asset version: " + asset.version);
            asset.minVersion && this._log("Asset minimum version: " + asset.minVersion);
            asset.generator && this._log("Asset generator: " + asset.generator);
            var version = GLTFFileLoader._parseVersion(asset.version);
            if (!version) {
                throw new Error("Invalid version: " + asset.version);
            }
            if (asset.minVersion !== undefined) {
                var minVersion = GLTFFileLoader._parseVersion(asset.minVersion);
                if (!minVersion) {
                    throw new Error("Invalid minimum version: " + asset.minVersion);
                }
                if (GLTFFileLoader._compareVersion(minVersion, { major: 2, minor: 0 }) > 0) {
                    throw new Error("Incompatible minimum version: " + asset.minVersion);
                }
            }
            var createLoaders = {
                1: GLTFFileLoader._CreateGLTFLoaderV1,
                2: GLTFFileLoader._CreateGLTFLoaderV2
            };
            var createLoader = createLoaders[version.major];
            if (!createLoader) {
                throw new Error("Unsupported version: " + asset.version);
            }
            return createLoader(this);
        };
        GLTFFileLoader.prototype._unpackBinary = function (data) {
            this._startPerformanceCounter("Unpack binary");
            this._log("Binary length: " + data.byteLength);
            var Binary = {
                Magic: 0x46546C67
            };
            var binaryReader = new BinaryReader(data);
            var magic = binaryReader.readUint32();
            if (magic !== Binary.Magic) {
                throw new Error("Unexpected magic: " + magic);
            }
            var version = binaryReader.readUint32();
            if (this.loggingEnabled) {
                this._log("Binary version: " + version);
            }
            var unpacked;
            switch (version) {
                case 1: {
                    unpacked = this._unpackBinaryV1(binaryReader);
                    break;
                }
                case 2: {
                    unpacked = this._unpackBinaryV2(binaryReader);
                    break;
                }
                default: {
                    throw new Error("Unsupported version: " + version);
                }
            }
            this._endPerformanceCounter("Unpack binary");
            return unpacked;
        };
        GLTFFileLoader.prototype._unpackBinaryV1 = function (binaryReader) {
            var ContentFormat = {
                JSON: 0
            };
            var length = binaryReader.readUint32();
            if (length != binaryReader.getLength()) {
                throw new Error("Length in header does not match actual data length: " + length + " != " + binaryReader.getLength());
            }
            var contentLength = binaryReader.readUint32();
            var contentFormat = binaryReader.readUint32();
            var content;
            switch (contentFormat) {
                case ContentFormat.JSON: {
                    content = GLTFFileLoader._decodeBufferToText(binaryReader.readUint8Array(contentLength));
                    break;
                }
                default: {
                    throw new Error("Unexpected content format: " + contentFormat);
                }
            }
            var bytesRemaining = binaryReader.getLength() - binaryReader.getPosition();
            var body = binaryReader.readUint8Array(bytesRemaining);
            return {
                json: content,
                bin: body
            };
        };
        GLTFFileLoader.prototype._unpackBinaryV2 = function (binaryReader) {
            var ChunkFormat = {
                JSON: 0x4E4F534A,
                BIN: 0x004E4942
            };
            var length = binaryReader.readUint32();
            if (length !== binaryReader.getLength()) {
                throw new Error("Length in header does not match actual data length: " + length + " != " + binaryReader.getLength());
            }
            // JSON chunk
            var chunkLength = binaryReader.readUint32();
            var chunkFormat = binaryReader.readUint32();
            if (chunkFormat !== ChunkFormat.JSON) {
                throw new Error("First chunk format is not JSON");
            }
            var json = GLTFFileLoader._decodeBufferToText(binaryReader.readUint8Array(chunkLength));
            // Look for BIN chunk
            var bin = null;
            while (binaryReader.getPosition() < binaryReader.getLength()) {
                var chunkLength_1 = binaryReader.readUint32();
                var chunkFormat_1 = binaryReader.readUint32();
                switch (chunkFormat_1) {
                    case ChunkFormat.JSON: {
                        throw new Error("Unexpected JSON chunk");
                    }
                    case ChunkFormat.BIN: {
                        bin = binaryReader.readUint8Array(chunkLength_1);
                        break;
                    }
                    default: {
                        // ignore unrecognized chunkFormat
                        binaryReader.skipBytes(chunkLength_1);
                        break;
                    }
                }
            }
            return {
                json: json,
                bin: bin
            };
        };
        GLTFFileLoader._parseVersion = function (version) {
            if (version === "1.0" || version === "1.0.1") {
                return {
                    major: 1,
                    minor: 0
                };
            }
            var match = (version + "").match(/^(\d+)\.(\d+)/);
            if (!match) {
                return null;
            }
            return {
                major: parseInt(match[1]),
                minor: parseInt(match[2])
            };
        };
        GLTFFileLoader._compareVersion = function (a, b) {
            if (a.major > b.major) {
                return 1;
            }
            if (a.major < b.major) {
                return -1;
            }
            if (a.minor > b.minor) {
                return 1;
            }
            if (a.minor < b.minor) {
                return -1;
            }
            return 0;
        };
        GLTFFileLoader._decodeBufferToText = function (buffer) {
            var result = "";
            var length = buffer.byteLength;
            for (var i = 0; i < length; i++) {
                result += String.fromCharCode(buffer[i]);
            }
            return result;
        };
        /** @hidden */
        GLTFFileLoader.prototype._logOpen = function (message) {
            this._log(message);
            this._logIndentLevel++;
        };
        /** @hidden */
        GLTFFileLoader.prototype._logClose = function () {
            --this._logIndentLevel;
        };
        GLTFFileLoader.prototype._logEnabled = function (message) {
            var spaces = GLTFFileLoader._logSpaces.substr(0, this._logIndentLevel * 2);
            BABYLON.Tools.Log("" + spaces + message);
        };
        GLTFFileLoader.prototype._logDisabled = function (message) {
        };
        GLTFFileLoader.prototype._startPerformanceCounterEnabled = function (counterName) {
            BABYLON.Tools.StartPerformanceCounter(counterName);
        };
        GLTFFileLoader.prototype._startPerformanceCounterDisabled = function (counterName) {
        };
        GLTFFileLoader.prototype._endPerformanceCounterEnabled = function (counterName) {
            BABYLON.Tools.EndPerformanceCounter(counterName);
        };
        GLTFFileLoader.prototype._endPerformanceCounterDisabled = function (counterName) {
        };
        // ----------
        // V1 options
        // ----------
        /**
         * Set this property to false to disable incremental loading which delays the loader from calling the success callback until after loading the meshes and shaders.
         * Textures always loads asynchronously. For example, the success callback can compute the bounding information of the loaded meshes when incremental loading is disabled.
         * Defaults to true.
         * @hidden
         */
        GLTFFileLoader.IncrementalLoading = true;
        /**
         * Set this property to true in order to work with homogeneous coordinates, available with some converters and exporters.
         * Defaults to false. See https://en.wikipedia.org/wiki/Homogeneous_coordinates.
         * @hidden
         */
        GLTFFileLoader.HomogeneousCoordinates = false;
        GLTFFileLoader._logSpaces = "                                ";
        return GLTFFileLoader;
    }());
    BABYLON.GLTFFileLoader = GLTFFileLoader;
    var BinaryReader = /** @class */ (function () {
        function BinaryReader(arrayBuffer) {
            this._arrayBuffer = arrayBuffer;
            this._dataView = new DataView(arrayBuffer);
            this._byteOffset = 0;
        }
        BinaryReader.prototype.getPosition = function () {
            return this._byteOffset;
        };
        BinaryReader.prototype.getLength = function () {
            return this._arrayBuffer.byteLength;
        };
        BinaryReader.prototype.readUint32 = function () {
            var value = this._dataView.getUint32(this._byteOffset, true);
            this._byteOffset += 4;
            return value;
        };
        BinaryReader.prototype.readUint8Array = function (length) {
            var value = new Uint8Array(this._arrayBuffer, this._byteOffset, length);
            this._byteOffset += length;
            return value;
        };
        BinaryReader.prototype.skipBytes = function (length) {
            this._byteOffset += length;
        };
        return BinaryReader;
    }());
    if (BABYLON.SceneLoader) {
        BABYLON.SceneLoader.RegisterPlugin(new GLTFFileLoader());
    }
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFFileLoader.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF1;
    (function (GLTF1) {
        /**
        * Enums
        */
        var EComponentType;
        (function (EComponentType) {
            EComponentType[EComponentType["BYTE"] = 5120] = "BYTE";
            EComponentType[EComponentType["UNSIGNED_BYTE"] = 5121] = "UNSIGNED_BYTE";
            EComponentType[EComponentType["SHORT"] = 5122] = "SHORT";
            EComponentType[EComponentType["UNSIGNED_SHORT"] = 5123] = "UNSIGNED_SHORT";
            EComponentType[EComponentType["FLOAT"] = 5126] = "FLOAT";
        })(EComponentType = GLTF1.EComponentType || (GLTF1.EComponentType = {}));
        var EShaderType;
        (function (EShaderType) {
            EShaderType[EShaderType["FRAGMENT"] = 35632] = "FRAGMENT";
            EShaderType[EShaderType["VERTEX"] = 35633] = "VERTEX";
        })(EShaderType = GLTF1.EShaderType || (GLTF1.EShaderType = {}));
        var EParameterType;
        (function (EParameterType) {
            EParameterType[EParameterType["BYTE"] = 5120] = "BYTE";
            EParameterType[EParameterType["UNSIGNED_BYTE"] = 5121] = "UNSIGNED_BYTE";
            EParameterType[EParameterType["SHORT"] = 5122] = "SHORT";
            EParameterType[EParameterType["UNSIGNED_SHORT"] = 5123] = "UNSIGNED_SHORT";
            EParameterType[EParameterType["INT"] = 5124] = "INT";
            EParameterType[EParameterType["UNSIGNED_INT"] = 5125] = "UNSIGNED_INT";
            EParameterType[EParameterType["FLOAT"] = 5126] = "FLOAT";
            EParameterType[EParameterType["FLOAT_VEC2"] = 35664] = "FLOAT_VEC2";
            EParameterType[EParameterType["FLOAT_VEC3"] = 35665] = "FLOAT_VEC3";
            EParameterType[EParameterType["FLOAT_VEC4"] = 35666] = "FLOAT_VEC4";
            EParameterType[EParameterType["INT_VEC2"] = 35667] = "INT_VEC2";
            EParameterType[EParameterType["INT_VEC3"] = 35668] = "INT_VEC3";
            EParameterType[EParameterType["INT_VEC4"] = 35669] = "INT_VEC4";
            EParameterType[EParameterType["BOOL"] = 35670] = "BOOL";
            EParameterType[EParameterType["BOOL_VEC2"] = 35671] = "BOOL_VEC2";
            EParameterType[EParameterType["BOOL_VEC3"] = 35672] = "BOOL_VEC3";
            EParameterType[EParameterType["BOOL_VEC4"] = 35673] = "BOOL_VEC4";
            EParameterType[EParameterType["FLOAT_MAT2"] = 35674] = "FLOAT_MAT2";
            EParameterType[EParameterType["FLOAT_MAT3"] = 35675] = "FLOAT_MAT3";
            EParameterType[EParameterType["FLOAT_MAT4"] = 35676] = "FLOAT_MAT4";
            EParameterType[EParameterType["SAMPLER_2D"] = 35678] = "SAMPLER_2D";
        })(EParameterType = GLTF1.EParameterType || (GLTF1.EParameterType = {}));
        var ETextureWrapMode;
        (function (ETextureWrapMode) {
            ETextureWrapMode[ETextureWrapMode["CLAMP_TO_EDGE"] = 33071] = "CLAMP_TO_EDGE";
            ETextureWrapMode[ETextureWrapMode["MIRRORED_REPEAT"] = 33648] = "MIRRORED_REPEAT";
            ETextureWrapMode[ETextureWrapMode["REPEAT"] = 10497] = "REPEAT";
        })(ETextureWrapMode = GLTF1.ETextureWrapMode || (GLTF1.ETextureWrapMode = {}));
        var ETextureFilterType;
        (function (ETextureFilterType) {
            ETextureFilterType[ETextureFilterType["NEAREST"] = 9728] = "NEAREST";
            ETextureFilterType[ETextureFilterType["LINEAR"] = 9728] = "LINEAR";
            ETextureFilterType[ETextureFilterType["NEAREST_MIPMAP_NEAREST"] = 9984] = "NEAREST_MIPMAP_NEAREST";
            ETextureFilterType[ETextureFilterType["LINEAR_MIPMAP_NEAREST"] = 9985] = "LINEAR_MIPMAP_NEAREST";
            ETextureFilterType[ETextureFilterType["NEAREST_MIPMAP_LINEAR"] = 9986] = "NEAREST_MIPMAP_LINEAR";
            ETextureFilterType[ETextureFilterType["LINEAR_MIPMAP_LINEAR"] = 9987] = "LINEAR_MIPMAP_LINEAR";
        })(ETextureFilterType = GLTF1.ETextureFilterType || (GLTF1.ETextureFilterType = {}));
        var ETextureFormat;
        (function (ETextureFormat) {
            ETextureFormat[ETextureFormat["ALPHA"] = 6406] = "ALPHA";
            ETextureFormat[ETextureFormat["RGB"] = 6407] = "RGB";
            ETextureFormat[ETextureFormat["RGBA"] = 6408] = "RGBA";
            ETextureFormat[ETextureFormat["LUMINANCE"] = 6409] = "LUMINANCE";
            ETextureFormat[ETextureFormat["LUMINANCE_ALPHA"] = 6410] = "LUMINANCE_ALPHA";
        })(ETextureFormat = GLTF1.ETextureFormat || (GLTF1.ETextureFormat = {}));
        var ECullingType;
        (function (ECullingType) {
            ECullingType[ECullingType["FRONT"] = 1028] = "FRONT";
            ECullingType[ECullingType["BACK"] = 1029] = "BACK";
            ECullingType[ECullingType["FRONT_AND_BACK"] = 1032] = "FRONT_AND_BACK";
        })(ECullingType = GLTF1.ECullingType || (GLTF1.ECullingType = {}));
        var EBlendingFunction;
        (function (EBlendingFunction) {
            EBlendingFunction[EBlendingFunction["ZERO"] = 0] = "ZERO";
            EBlendingFunction[EBlendingFunction["ONE"] = 1] = "ONE";
            EBlendingFunction[EBlendingFunction["SRC_COLOR"] = 768] = "SRC_COLOR";
            EBlendingFunction[EBlendingFunction["ONE_MINUS_SRC_COLOR"] = 769] = "ONE_MINUS_SRC_COLOR";
            EBlendingFunction[EBlendingFunction["DST_COLOR"] = 774] = "DST_COLOR";
            EBlendingFunction[EBlendingFunction["ONE_MINUS_DST_COLOR"] = 775] = "ONE_MINUS_DST_COLOR";
            EBlendingFunction[EBlendingFunction["SRC_ALPHA"] = 770] = "SRC_ALPHA";
            EBlendingFunction[EBlendingFunction["ONE_MINUS_SRC_ALPHA"] = 771] = "ONE_MINUS_SRC_ALPHA";
            EBlendingFunction[EBlendingFunction["DST_ALPHA"] = 772] = "DST_ALPHA";
            EBlendingFunction[EBlendingFunction["ONE_MINUS_DST_ALPHA"] = 773] = "ONE_MINUS_DST_ALPHA";
            EBlendingFunction[EBlendingFunction["CONSTANT_COLOR"] = 32769] = "CONSTANT_COLOR";
            EBlendingFunction[EBlendingFunction["ONE_MINUS_CONSTANT_COLOR"] = 32770] = "ONE_MINUS_CONSTANT_COLOR";
            EBlendingFunction[EBlendingFunction["CONSTANT_ALPHA"] = 32771] = "CONSTANT_ALPHA";
            EBlendingFunction[EBlendingFunction["ONE_MINUS_CONSTANT_ALPHA"] = 32772] = "ONE_MINUS_CONSTANT_ALPHA";
            EBlendingFunction[EBlendingFunction["SRC_ALPHA_SATURATE"] = 776] = "SRC_ALPHA_SATURATE";
        })(EBlendingFunction = GLTF1.EBlendingFunction || (GLTF1.EBlendingFunction = {}));
    })(GLTF1 = BABYLON.GLTF1 || (BABYLON.GLTF1 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFLoaderInterfaces.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF1;
    (function (GLTF1) {
        /**
        * Tokenizer. Used for shaders compatibility
        * Automatically map world, view, projection, worldViewProjection, attributes and so on
        */
        var ETokenType;
        (function (ETokenType) {
            ETokenType[ETokenType["IDENTIFIER"] = 1] = "IDENTIFIER";
            ETokenType[ETokenType["UNKNOWN"] = 2] = "UNKNOWN";
            ETokenType[ETokenType["END_OF_INPUT"] = 3] = "END_OF_INPUT";
        })(ETokenType || (ETokenType = {}));
        var Tokenizer = /** @class */ (function () {
            function Tokenizer(toParse) {
                this._pos = 0;
                this.currentToken = ETokenType.UNKNOWN;
                this.currentIdentifier = "";
                this.currentString = "";
                this.isLetterOrDigitPattern = /^[a-zA-Z0-9]+$/;
                this._toParse = toParse;
                this._maxPos = toParse.length;
            }
            Tokenizer.prototype.getNextToken = function () {
                if (this.isEnd()) {
                    return ETokenType.END_OF_INPUT;
                }
                this.currentString = this.read();
                this.currentToken = ETokenType.UNKNOWN;
                if (this.currentString === "_" || this.isLetterOrDigitPattern.test(this.currentString)) {
                    this.currentToken = ETokenType.IDENTIFIER;
                    this.currentIdentifier = this.currentString;
                    while (!this.isEnd() && (this.isLetterOrDigitPattern.test(this.currentString = this.peek()) || this.currentString === "_")) {
                        this.currentIdentifier += this.currentString;
                        this.forward();
                    }
                }
                return this.currentToken;
            };
            Tokenizer.prototype.peek = function () {
                return this._toParse[this._pos];
            };
            Tokenizer.prototype.read = function () {
                return this._toParse[this._pos++];
            };
            Tokenizer.prototype.forward = function () {
                this._pos++;
            };
            Tokenizer.prototype.isEnd = function () {
                return this._pos >= this._maxPos;
            };
            return Tokenizer;
        }());
        /**
        * Values
        */
        var glTFTransforms = ["MODEL", "VIEW", "PROJECTION", "MODELVIEW", "MODELVIEWPROJECTION", "JOINTMATRIX"];
        var babylonTransforms = ["world", "view", "projection", "worldView", "worldViewProjection", "mBones"];
        var glTFAnimationPaths = ["translation", "rotation", "scale"];
        var babylonAnimationPaths = ["position", "rotationQuaternion", "scaling"];
        /**
        * Parse
        */
        var parseBuffers = function (parsedBuffers, gltfRuntime) {
            for (var buf in parsedBuffers) {
                var parsedBuffer = parsedBuffers[buf];
                gltfRuntime.buffers[buf] = parsedBuffer;
                gltfRuntime.buffersCount++;
            }
        };
        var parseShaders = function (parsedShaders, gltfRuntime) {
            for (var sha in parsedShaders) {
                var parsedShader = parsedShaders[sha];
                gltfRuntime.shaders[sha] = parsedShader;
                gltfRuntime.shaderscount++;
            }
        };
        var parseObject = function (parsedObjects, runtimeProperty, gltfRuntime) {
            for (var object in parsedObjects) {
                var parsedObject = parsedObjects[object];
                gltfRuntime[runtimeProperty][object] = parsedObject;
            }
        };
        /**
        * Utils
        */
        var normalizeUVs = function (buffer) {
            if (!buffer) {
                return;
            }
            for (var i = 0; i < buffer.length / 2; i++) {
                buffer[i * 2 + 1] = 1.0 - buffer[i * 2 + 1];
            }
        };
        var getAttribute = function (attributeParameter) {
            if (attributeParameter.semantic === "NORMAL") {
                return "normal";
            }
            else if (attributeParameter.semantic === "POSITION") {
                return "position";
            }
            else if (attributeParameter.semantic === "JOINT") {
                return "matricesIndices";
            }
            else if (attributeParameter.semantic === "WEIGHT") {
                return "matricesWeights";
            }
            else if (attributeParameter.semantic === "COLOR") {
                return "color";
            }
            else if (attributeParameter.semantic && attributeParameter.semantic.indexOf("TEXCOORD_") !== -1) {
                var channel = Number(attributeParameter.semantic.split("_")[1]);
                return "uv" + (channel === 0 ? "" : channel + 1);
            }
            return null;
        };
        /**
        * Loads and creates animations
        */
        var loadAnimations = function (gltfRuntime) {
            for (var anim in gltfRuntime.animations) {
                var animation = gltfRuntime.animations[anim];
                if (!animation.channels || !animation.samplers) {
                    continue;
                }
                var lastAnimation = null;
                for (var i = 0; i < animation.channels.length; i++) {
                    // Get parameters and load buffers
                    var channel = animation.channels[i];
                    var sampler = animation.samplers[channel.sampler];
                    if (!sampler) {
                        continue;
                    }
                    var inputData = null;
                    var outputData = null;
                    if (animation.parameters) {
                        inputData = animation.parameters[sampler.input];
                        outputData = animation.parameters[sampler.output];
                    }
                    else {
                        inputData = sampler.input;
                        outputData = sampler.output;
                    }
                    var bufferInput = GLTF1.GLTFUtils.GetBufferFromAccessor(gltfRuntime, gltfRuntime.accessors[inputData]);
                    var bufferOutput = GLTF1.GLTFUtils.GetBufferFromAccessor(gltfRuntime, gltfRuntime.accessors[outputData]);
                    var targetID = channel.target.id;
                    var targetNode = gltfRuntime.scene.getNodeByID(targetID);
                    if (targetNode === null) {
                        targetNode = gltfRuntime.scene.getNodeByName(targetID);
                    }
                    if (targetNode === null) {
                        BABYLON.Tools.Warn("Creating animation named " + anim + ". But cannot find node named " + targetID + " to attach to");
                        continue;
                    }
                    var isBone = targetNode instanceof BABYLON.Bone;
                    // Get target path (position, rotation or scaling)
                    var targetPath = channel.target.path;
                    var targetPathIndex = glTFAnimationPaths.indexOf(targetPath);
                    if (targetPathIndex !== -1) {
                        targetPath = babylonAnimationPaths[targetPathIndex];
                    }
                    // Determine animation type
                    var animationType = BABYLON.Animation.ANIMATIONTYPE_MATRIX;
                    if (!isBone) {
                        if (targetPath === "rotationQuaternion") {
                            animationType = BABYLON.Animation.ANIMATIONTYPE_QUATERNION;
                            targetNode.rotationQuaternion = new BABYLON.Quaternion();
                        }
                        else {
                            animationType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                        }
                    }
                    // Create animation and key frames
                    var babylonAnimation = null;
                    var keys = [];
                    var arrayOffset = 0;
                    var modifyKey = false;
                    if (isBone && lastAnimation && lastAnimation.getKeys().length === bufferInput.length) {
                        babylonAnimation = lastAnimation;
                        modifyKey = true;
                    }
                    if (!modifyKey) {
                        babylonAnimation = new BABYLON.Animation(anim, isBone ? "_matrix" : targetPath, 1, animationType, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                    }
                    // For each frame
                    for (var j = 0; j < bufferInput.length; j++) {
                        var value = null;
                        if (targetPath === "rotationQuaternion") { // VEC4
                            value = BABYLON.Quaternion.FromArray([bufferOutput[arrayOffset], bufferOutput[arrayOffset + 1], bufferOutput[arrayOffset + 2], bufferOutput[arrayOffset + 3]]);
                            arrayOffset += 4;
                        }
                        else { // Position and scaling are VEC3
                            value = BABYLON.Vector3.FromArray([bufferOutput[arrayOffset], bufferOutput[arrayOffset + 1], bufferOutput[arrayOffset + 2]]);
                            arrayOffset += 3;
                        }
                        if (isBone) {
                            var bone = targetNode;
                            var translation = BABYLON.Vector3.Zero();
                            var rotationQuaternion = new BABYLON.Quaternion();
                            var scaling = BABYLON.Vector3.Zero();
                            // Warning on decompose
                            var mat = bone.getBaseMatrix();
                            if (modifyKey && lastAnimation) {
                                mat = lastAnimation.getKeys()[j].value;
                            }
                            mat.decompose(scaling, rotationQuaternion, translation);
                            if (targetPath === "position") {
                                translation = value;
                            }
                            else if (targetPath === "rotationQuaternion") {
                                rotationQuaternion = value;
                            }
                            else {
                                scaling = value;
                            }
                            value = BABYLON.Matrix.Compose(scaling, rotationQuaternion, translation);
                        }
                        if (!modifyKey) {
                            keys.push({
                                frame: bufferInput[j],
                                value: value
                            });
                        }
                        else if (lastAnimation) {
                            lastAnimation.getKeys()[j].value = value;
                        }
                    }
                    // Finish
                    if (!modifyKey && babylonAnimation) {
                        babylonAnimation.setKeys(keys);
                        targetNode.animations.push(babylonAnimation);
                    }
                    lastAnimation = babylonAnimation;
                    gltfRuntime.scene.stopAnimation(targetNode);
                    gltfRuntime.scene.beginAnimation(targetNode, 0, bufferInput[bufferInput.length - 1], true, 1.0);
                }
            }
        };
        /**
        * Returns the bones transformation matrix
        */
        var configureBoneTransformation = function (node) {
            var mat = null;
            if (node.translation || node.rotation || node.scale) {
                var scale = BABYLON.Vector3.FromArray(node.scale || [1, 1, 1]);
                var rotation = BABYLON.Quaternion.FromArray(node.rotation || [0, 0, 0, 1]);
                var position = BABYLON.Vector3.FromArray(node.translation || [0, 0, 0]);
                mat = BABYLON.Matrix.Compose(scale, rotation, position);
            }
            else {
                mat = BABYLON.Matrix.FromArray(node.matrix);
            }
            return mat;
        };
        /**
        * Returns the parent bone
        */
        var getParentBone = function (gltfRuntime, skins, jointName, newSkeleton) {
            // Try to find
            for (var i = 0; i < newSkeleton.bones.length; i++) {
                if (newSkeleton.bones[i].name === jointName) {
                    return newSkeleton.bones[i];
                }
            }
            // Not found, search in gltf nodes
            var nodes = gltfRuntime.nodes;
            for (var nde in nodes) {
                var node = nodes[nde];
                if (!node.jointName) {
                    continue;
                }
                var children = node.children;
                for (var i = 0; i < children.length; i++) {
                    var child = gltfRuntime.nodes[children[i]];
                    if (!child.jointName) {
                        continue;
                    }
                    if (child.jointName === jointName) {
                        var mat = configureBoneTransformation(node);
                        var bone = new BABYLON.Bone(node.name || "", newSkeleton, getParentBone(gltfRuntime, skins, node.jointName, newSkeleton), mat);
                        bone.id = nde;
                        return bone;
                    }
                }
            }
            return null;
        };
        /**
        * Returns the appropriate root node
        */
        var getNodeToRoot = function (nodesToRoot, id) {
            for (var i = 0; i < nodesToRoot.length; i++) {
                var nodeToRoot = nodesToRoot[i];
                for (var j = 0; j < nodeToRoot.node.children.length; j++) {
                    var child = nodeToRoot.node.children[j];
                    if (child === id) {
                        return nodeToRoot.bone;
                    }
                }
            }
            return null;
        };
        /**
        * Returns the node with the joint name
        */
        var getJointNode = function (gltfRuntime, jointName) {
            var nodes = gltfRuntime.nodes;
            var node = nodes[jointName];
            if (node) {
                return {
                    node: node,
                    id: jointName
                };
            }
            for (var nde in nodes) {
                node = nodes[nde];
                if (node.jointName === jointName) {
                    return {
                        node: node,
                        id: nde
                    };
                }
            }
            return null;
        };
        /**
        * Checks if a nodes is in joints
        */
        var nodeIsInJoints = function (skins, id) {
            for (var i = 0; i < skins.jointNames.length; i++) {
                if (skins.jointNames[i] === id) {
                    return true;
                }
            }
            return false;
        };
        /**
        * Fills the nodes to root for bones and builds hierarchy
        */
        var getNodesToRoot = function (gltfRuntime, newSkeleton, skins, nodesToRoot) {
            // Creates nodes for root
            for (var nde in gltfRuntime.nodes) {
                var node = gltfRuntime.nodes[nde];
                var id = nde;
                if (!node.jointName || nodeIsInJoints(skins, node.jointName)) {
                    continue;
                }
                // Create node to root bone
                var mat = configureBoneTransformation(node);
                var bone = new BABYLON.Bone(node.name || "", newSkeleton, null, mat);
                bone.id = id;
                nodesToRoot.push({ bone: bone, node: node, id: id });
            }
            // Parenting
            for (var i = 0; i < nodesToRoot.length; i++) {
                var nodeToRoot = nodesToRoot[i];
                var children = nodeToRoot.node.children;
                for (var j = 0; j < children.length; j++) {
                    var child = null;
                    for (var k = 0; k < nodesToRoot.length; k++) {
                        if (nodesToRoot[k].id === children[j]) {
                            child = nodesToRoot[k];
                            break;
                        }
                    }
                    if (child) {
                        child.bone._parent = nodeToRoot.bone;
                        nodeToRoot.bone.children.push(child.bone);
                    }
                }
            }
        };
        /**
        * Imports a skeleton
        */
        var importSkeleton = function (gltfRuntime, skins, mesh, newSkeleton, id) {
            if (!newSkeleton) {
                newSkeleton = new BABYLON.Skeleton(skins.name || "", "", gltfRuntime.scene);
            }
            if (!skins.babylonSkeleton) {
                return newSkeleton;
            }
            // Find the root bones
            var nodesToRoot = [];
            var nodesToRootToAdd = [];
            getNodesToRoot(gltfRuntime, newSkeleton, skins, nodesToRoot);
            newSkeleton.bones = [];
            // Joints
            for (var i = 0; i < skins.jointNames.length; i++) {
                var jointNode = getJointNode(gltfRuntime, skins.jointNames[i]);
                if (!jointNode) {
                    continue;
                }
                var node = jointNode.node;
                if (!node) {
                    BABYLON.Tools.Warn("Joint named " + skins.jointNames[i] + " does not exist");
                    continue;
                }
                var id = jointNode.id;
                // Optimize, if the bone already exists...
                var existingBone = gltfRuntime.scene.getBoneByID(id);
                if (existingBone) {
                    newSkeleton.bones.push(existingBone);
                    continue;
                }
                // Search for parent bone
                var foundBone = false;
                var parentBone = null;
                for (var j = 0; j < i; j++) {
                    var jointNode_1 = getJointNode(gltfRuntime, skins.jointNames[j]);
                    if (!jointNode_1) {
                        continue;
                    }
                    var joint = jointNode_1.node;
                    if (!joint) {
                        BABYLON.Tools.Warn("Joint named " + skins.jointNames[j] + " does not exist when looking for parent");
                        continue;
                    }
                    var children = joint.children;
                    if (!children) {
                        continue;
                    }
                    foundBone = false;
                    for (var k = 0; k < children.length; k++) {
                        if (children[k] === id) {
                            parentBone = getParentBone(gltfRuntime, skins, skins.jointNames[j], newSkeleton);
                            foundBone = true;
                            break;
                        }
                    }
                    if (foundBone) {
                        break;
                    }
                }
                // Create bone
                var mat = configureBoneTransformation(node);
                if (!parentBone && nodesToRoot.length > 0) {
                    parentBone = getNodeToRoot(nodesToRoot, id);
                    if (parentBone) {
                        if (nodesToRootToAdd.indexOf(parentBone) === -1) {
                            nodesToRootToAdd.push(parentBone);
                        }
                    }
                }
                var bone = new BABYLON.Bone(node.jointName || "", newSkeleton, parentBone, mat);
                bone.id = id;
            }
            // Polish
            var bones = newSkeleton.bones;
            newSkeleton.bones = [];
            for (var i = 0; i < skins.jointNames.length; i++) {
                var jointNode = getJointNode(gltfRuntime, skins.jointNames[i]);
                if (!jointNode) {
                    continue;
                }
                for (var j = 0; j < bones.length; j++) {
                    if (bones[j].id === jointNode.id) {
                        newSkeleton.bones.push(bones[j]);
                        break;
                    }
                }
            }
            newSkeleton.prepare();
            // Finish
            for (var i = 0; i < nodesToRootToAdd.length; i++) {
                newSkeleton.bones.push(nodesToRootToAdd[i]);
            }
            return newSkeleton;
        };
        /**
        * Imports a mesh and its geometries
        */
        var importMesh = function (gltfRuntime, node, meshes, id, newMesh) {
            if (!newMesh) {
                newMesh = new BABYLON.Mesh(node.name || "", gltfRuntime.scene);
                newMesh.id = id;
            }
            if (!node.babylonNode) {
                return newMesh;
            }
            var subMaterials = [];
            var vertexData = null;
            var verticesStarts = new Array();
            var verticesCounts = new Array();
            var indexStarts = new Array();
            var indexCounts = new Array();
            for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
                var meshID = meshes[meshIndex];
                var mesh = gltfRuntime.meshes[meshID];
                if (!mesh) {
                    continue;
                }
                // Positions, normals and UVs
                for (var i = 0; i < mesh.primitives.length; i++) {
                    // Temporary vertex data
                    var tempVertexData = new BABYLON.VertexData();
                    var primitive = mesh.primitives[i];
                    if (primitive.mode !== 4) {
                        // continue;
                    }
                    var attributes = primitive.attributes;
                    var accessor = null;
                    var buffer = null;
                    // Set positions, normal and uvs
                    for (var semantic in attributes) {
                        // Link accessor and buffer view
                        accessor = gltfRuntime.accessors[attributes[semantic]];
                        buffer = GLTF1.GLTFUtils.GetBufferFromAccessor(gltfRuntime, accessor);
                        if (semantic === "NORMAL") {
                            tempVertexData.normals = new Float32Array(buffer.length);
                            tempVertexData.normals.set(buffer);
                        }
                        else if (semantic === "POSITION") {
                            if (BABYLON.GLTFFileLoader.HomogeneousCoordinates) {
                                tempVertexData.positions = new Float32Array(buffer.length - buffer.length / 4);
                                for (var j = 0; j < buffer.length; j += 4) {
                                    tempVertexData.positions[j] = buffer[j];
                                    tempVertexData.positions[j + 1] = buffer[j + 1];
                                    tempVertexData.positions[j + 2] = buffer[j + 2];
                                }
                            }
                            else {
                                tempVertexData.positions = new Float32Array(buffer.length);
                                tempVertexData.positions.set(buffer);
                            }
                            verticesCounts.push(tempVertexData.positions.length);
                        }
                        else if (semantic.indexOf("TEXCOORD_") !== -1) {
                            var channel = Number(semantic.split("_")[1]);
                            var uvKind = BABYLON.VertexBuffer.UVKind + (channel === 0 ? "" : (channel + 1));
                            var uvs = new Float32Array(buffer.length);
                            uvs.set(buffer);
                            normalizeUVs(uvs);
                            tempVertexData.set(uvs, uvKind);
                        }
                        else if (semantic === "JOINT") {
                            tempVertexData.matricesIndices = new Float32Array(buffer.length);
                            tempVertexData.matricesIndices.set(buffer);
                        }
                        else if (semantic === "WEIGHT") {
                            tempVertexData.matricesWeights = new Float32Array(buffer.length);
                            tempVertexData.matricesWeights.set(buffer);
                        }
                        else if (semantic === "COLOR") {
                            tempVertexData.colors = new Float32Array(buffer.length);
                            tempVertexData.colors.set(buffer);
                        }
                    }
                    // Indices
                    accessor = gltfRuntime.accessors[primitive.indices];
                    if (accessor) {
                        buffer = GLTF1.GLTFUtils.GetBufferFromAccessor(gltfRuntime, accessor);
                        tempVertexData.indices = new Int32Array(buffer.length);
                        tempVertexData.indices.set(buffer);
                        indexCounts.push(tempVertexData.indices.length);
                    }
                    else {
                        // Set indices on the fly
                        var indices = [];
                        for (var j = 0; j < tempVertexData.positions.length / 3; j++) {
                            indices.push(j);
                        }
                        tempVertexData.indices = new Int32Array(indices);
                        indexCounts.push(tempVertexData.indices.length);
                    }
                    if (!vertexData) {
                        vertexData = tempVertexData;
                    }
                    else {
                        vertexData.merge(tempVertexData);
                    }
                    // Sub material
                    var material_1 = gltfRuntime.scene.getMaterialByID(primitive.material);
                    subMaterials.push(material_1 === null ? GLTF1.GLTFUtils.GetDefaultMaterial(gltfRuntime.scene) : material_1);
                    // Update vertices start and index start
                    verticesStarts.push(verticesStarts.length === 0 ? 0 : verticesStarts[verticesStarts.length - 1] + verticesCounts[verticesCounts.length - 2]);
                    indexStarts.push(indexStarts.length === 0 ? 0 : indexStarts[indexStarts.length - 1] + indexCounts[indexCounts.length - 2]);
                }
            }
            var material;
            if (subMaterials.length > 1) {
                material = new BABYLON.MultiMaterial("multimat" + id, gltfRuntime.scene);
                material.subMaterials = subMaterials;
            }
            else {
                material = new BABYLON.StandardMaterial("multimat" + id, gltfRuntime.scene);
            }
            if (subMaterials.length === 1) {
                material = subMaterials[0];
            }
            if (!newMesh.material) {
                newMesh.material = material;
            }
            // Apply geometry
            new BABYLON.Geometry(id, gltfRuntime.scene, vertexData, false, newMesh);
            newMesh.computeWorldMatrix(true);
            // Apply submeshes
            newMesh.subMeshes = [];
            var index = 0;
            for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
                var meshID = meshes[meshIndex];
                var mesh = gltfRuntime.meshes[meshID];
                if (!mesh) {
                    continue;
                }
                for (var i = 0; i < mesh.primitives.length; i++) {
                    if (mesh.primitives[i].mode !== 4) {
                        //continue;
                    }
                    BABYLON.SubMesh.AddToMesh(index, verticesStarts[index], verticesCounts[index], indexStarts[index], indexCounts[index], newMesh, newMesh, true);
                    index++;
                }
            }
            // Finish
            return newMesh;
        };
        /**
        * Configure node transformation from position, rotation and scaling
        */
        var configureNode = function (newNode, position, rotation, scaling) {
            if (newNode.position) {
                newNode.position = position;
            }
            if (newNode.rotationQuaternion || newNode.rotation) {
                newNode.rotationQuaternion = rotation;
            }
            if (newNode.scaling) {
                newNode.scaling = scaling;
            }
        };
        /**
        * Configures node from transformation matrix
        */
        var configureNodeFromMatrix = function (newNode, node, parent) {
            if (node.matrix) {
                var position = new BABYLON.Vector3(0, 0, 0);
                var rotation = new BABYLON.Quaternion();
                var scaling = new BABYLON.Vector3(0, 0, 0);
                var mat = BABYLON.Matrix.FromArray(node.matrix);
                mat.decompose(scaling, rotation, position);
                configureNode(newNode, position, rotation, scaling);
            }
            else if (node.translation && node.rotation && node.scale) {
                configureNode(newNode, BABYLON.Vector3.FromArray(node.translation), BABYLON.Quaternion.FromArray(node.rotation), BABYLON.Vector3.FromArray(node.scale));
            }
            newNode.computeWorldMatrix(true);
        };
        /**
        * Imports a node
        */
        var importNode = function (gltfRuntime, node, id, parent) {
            var lastNode = null;
            if (gltfRuntime.importOnlyMeshes && (node.skin || node.meshes)) {
                if (gltfRuntime.importMeshesNames && gltfRuntime.importMeshesNames.length > 0 && gltfRuntime.importMeshesNames.indexOf(node.name || "") === -1) {
                    return null;
                }
            }
            // Meshes
            if (node.skin) {
                if (node.meshes) {
                    var skin = gltfRuntime.skins[node.skin];
                    var newMesh = importMesh(gltfRuntime, node, node.meshes, id, node.babylonNode);
                    newMesh.skeleton = gltfRuntime.scene.getLastSkeletonByID(node.skin);
                    if (newMesh.skeleton === null) {
                        newMesh.skeleton = importSkeleton(gltfRuntime, skin, newMesh, skin.babylonSkeleton, node.skin);
                        if (!skin.babylonSkeleton) {
                            skin.babylonSkeleton = newMesh.skeleton;
                        }
                    }
                    lastNode = newMesh;
                }
            }
            else if (node.meshes) {
                /**
                * Improve meshes property
                */
                var newMesh = importMesh(gltfRuntime, node, node.mesh ? [node.mesh] : node.meshes, id, node.babylonNode);
                lastNode = newMesh;
            }
            // Lights
            else if (node.light && !node.babylonNode && !gltfRuntime.importOnlyMeshes) {
                var light = gltfRuntime.lights[node.light];
                if (light) {
                    if (light.type === "ambient") {
                        var ambienLight = light[light.type];
                        var hemiLight = new BABYLON.HemisphericLight(node.light, BABYLON.Vector3.Zero(), gltfRuntime.scene);
                        hemiLight.name = node.name || "";
                        if (ambienLight.color) {
                            hemiLight.diffuse = BABYLON.Color3.FromArray(ambienLight.color);
                        }
                        lastNode = hemiLight;
                    }
                    else if (light.type === "directional") {
                        var directionalLight = light[light.type];
                        var dirLight = new BABYLON.DirectionalLight(node.light, BABYLON.Vector3.Zero(), gltfRuntime.scene);
                        dirLight.name = node.name || "";
                        if (directionalLight.color) {
                            dirLight.diffuse = BABYLON.Color3.FromArray(directionalLight.color);
                        }
                        lastNode = dirLight;
                    }
                    else if (light.type === "point") {
                        var pointLight = light[light.type];
                        var ptLight = new BABYLON.PointLight(node.light, BABYLON.Vector3.Zero(), gltfRuntime.scene);
                        ptLight.name = node.name || "";
                        if (pointLight.color) {
                            ptLight.diffuse = BABYLON.Color3.FromArray(pointLight.color);
                        }
                        lastNode = ptLight;
                    }
                    else if (light.type === "spot") {
                        var spotLight = light[light.type];
                        var spLight = new BABYLON.SpotLight(node.light, BABYLON.Vector3.Zero(), BABYLON.Vector3.Zero(), 0, 0, gltfRuntime.scene);
                        spLight.name = node.name || "";
                        if (spotLight.color) {
                            spLight.diffuse = BABYLON.Color3.FromArray(spotLight.color);
                        }
                        if (spotLight.fallOfAngle) {
                            spLight.angle = spotLight.fallOfAngle;
                        }
                        if (spotLight.fallOffExponent) {
                            spLight.exponent = spotLight.fallOffExponent;
                        }
                        lastNode = spLight;
                    }
                }
            }
            // Cameras
            else if (node.camera && !node.babylonNode && !gltfRuntime.importOnlyMeshes) {
                var camera = gltfRuntime.cameras[node.camera];
                if (camera) {
                    if (camera.type === "orthographic") {
                        var orthoCamera = new BABYLON.FreeCamera(node.camera, BABYLON.Vector3.Zero(), gltfRuntime.scene, false);
                        orthoCamera.name = node.name || "";
                        orthoCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
                        orthoCamera.attachControl(gltfRuntime.scene.getEngine().getRenderingCanvas());
                        lastNode = orthoCamera;
                    }
                    else if (camera.type === "perspective") {
                        var perspectiveCamera = camera[camera.type];
                        var persCamera = new BABYLON.FreeCamera(node.camera, BABYLON.Vector3.Zero(), gltfRuntime.scene, false);
                        persCamera.name = node.name || "";
                        persCamera.attachControl(gltfRuntime.scene.getEngine().getRenderingCanvas());
                        if (!perspectiveCamera.aspectRatio) {
                            perspectiveCamera.aspectRatio = gltfRuntime.scene.getEngine().getRenderWidth() / gltfRuntime.scene.getEngine().getRenderHeight();
                        }
                        if (perspectiveCamera.znear && perspectiveCamera.zfar) {
                            persCamera.maxZ = perspectiveCamera.zfar;
                            persCamera.minZ = perspectiveCamera.znear;
                        }
                        lastNode = persCamera;
                    }
                }
            }
            // Empty node
            if (!node.jointName) {
                if (node.babylonNode) {
                    return node.babylonNode;
                }
                else if (lastNode === null) {
                    var dummy = new BABYLON.Mesh(node.name || "", gltfRuntime.scene);
                    node.babylonNode = dummy;
                    lastNode = dummy;
                }
            }
            if (lastNode !== null) {
                if (node.matrix && lastNode instanceof BABYLON.Mesh) {
                    configureNodeFromMatrix(lastNode, node, parent);
                }
                else {
                    var translation = node.translation || [0, 0, 0];
                    var rotation = node.rotation || [0, 0, 0, 1];
                    var scale = node.scale || [1, 1, 1];
                    configureNode(lastNode, BABYLON.Vector3.FromArray(translation), BABYLON.Quaternion.FromArray(rotation), BABYLON.Vector3.FromArray(scale));
                }
                lastNode.updateCache(true);
                node.babylonNode = lastNode;
            }
            return lastNode;
        };
        /**
        * Traverses nodes and creates them
        */
        var traverseNodes = function (gltfRuntime, id, parent, meshIncluded) {
            if (meshIncluded === void 0) { meshIncluded = false; }
            var node = gltfRuntime.nodes[id];
            var newNode = null;
            if (gltfRuntime.importOnlyMeshes && !meshIncluded && gltfRuntime.importMeshesNames) {
                if (gltfRuntime.importMeshesNames.indexOf(node.name || "") !== -1 || gltfRuntime.importMeshesNames.length === 0) {
                    meshIncluded = true;
                }
                else {
                    meshIncluded = false;
                }
            }
            else {
                meshIncluded = true;
            }
            if (!node.jointName && meshIncluded) {
                newNode = importNode(gltfRuntime, node, id, parent);
                if (newNode !== null) {
                    newNode.id = id;
                    newNode.parent = parent;
                }
            }
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) {
                    traverseNodes(gltfRuntime, node.children[i], newNode, meshIncluded);
                }
            }
        };
        /**
        * do stuff after buffers, shaders are loaded (e.g. hook up materials, load animations, etc.)
        */
        var postLoad = function (gltfRuntime) {
            // Nodes
            var currentScene = gltfRuntime.currentScene;
            if (currentScene) {
                for (var i = 0; i < currentScene.nodes.length; i++) {
                    traverseNodes(gltfRuntime, currentScene.nodes[i], null);
                }
            }
            else {
                for (var thing in gltfRuntime.scenes) {
                    currentScene = gltfRuntime.scenes[thing];
                    for (var i = 0; i < currentScene.nodes.length; i++) {
                        traverseNodes(gltfRuntime, currentScene.nodes[i], null);
                    }
                }
            }
            // Set animations
            loadAnimations(gltfRuntime);
            for (var i = 0; i < gltfRuntime.scene.skeletons.length; i++) {
                var skeleton = gltfRuntime.scene.skeletons[i];
                gltfRuntime.scene.beginAnimation(skeleton, 0, Number.MAX_VALUE, true, 1.0);
            }
        };
        /**
        * onBind shaderrs callback to set uniforms and matrices
        */
        var onBindShaderMaterial = function (mesh, gltfRuntime, unTreatedUniforms, shaderMaterial, technique, material, onSuccess) {
            var materialValues = material.values || technique.parameters;
            for (var unif in unTreatedUniforms) {
                var uniform = unTreatedUniforms[unif];
                var type = uniform.type;
                if (type === GLTF1.EParameterType.FLOAT_MAT2 || type === GLTF1.EParameterType.FLOAT_MAT3 || type === GLTF1.EParameterType.FLOAT_MAT4) {
                    if (uniform.semantic && !uniform.source && !uniform.node) {
                        GLTF1.GLTFUtils.SetMatrix(gltfRuntime.scene, mesh, uniform, unif, shaderMaterial.getEffect());
                    }
                    else if (uniform.semantic && (uniform.source || uniform.node)) {
                        var source = gltfRuntime.scene.getNodeByName(uniform.source || uniform.node || "");
                        if (source === null) {
                            source = gltfRuntime.scene.getNodeByID(uniform.source || uniform.node || "");
                        }
                        if (source === null) {
                            continue;
                        }
                        GLTF1.GLTFUtils.SetMatrix(gltfRuntime.scene, source, uniform, unif, shaderMaterial.getEffect());
                    }
                }
                else {
                    var value = materialValues[technique.uniforms[unif]];
                    if (!value) {
                        continue;
                    }
                    if (type === GLTF1.EParameterType.SAMPLER_2D) {
                        var texture = gltfRuntime.textures[material.values ? value : uniform.value].babylonTexture;
                        if (texture === null || texture === undefined) {
                            continue;
                        }
                        shaderMaterial.getEffect().setTexture(unif, texture);
                    }
                    else {
                        GLTF1.GLTFUtils.SetUniform((shaderMaterial.getEffect()), unif, value, type);
                    }
                }
            }
            onSuccess(shaderMaterial);
        };
        /**
        * Prepare uniforms to send the only one time
        * Loads the appropriate textures
        */
        var prepareShaderMaterialUniforms = function (gltfRuntime, shaderMaterial, technique, material, unTreatedUniforms) {
            var materialValues = material.values || technique.parameters;
            var techniqueUniforms = technique.uniforms;
            /**
            * Prepare values here (not matrices)
            */
            for (var unif in unTreatedUniforms) {
                var uniform = unTreatedUniforms[unif];
                var type = uniform.type;
                var value = materialValues[techniqueUniforms[unif]];
                if (value === undefined) {
                    // In case the value is the same for all materials
                    value = uniform.value;
                }
                if (!value) {
                    continue;
                }
                var onLoadTexture = function (uniformName) {
                    return function (texture) {
                        if (uniform.value && uniformName) {
                            // Static uniform
                            shaderMaterial.setTexture(uniformName, texture);
                            delete unTreatedUniforms[uniformName];
                        }
                    };
                };
                // Texture (sampler2D)
                if (type === GLTF1.EParameterType.SAMPLER_2D) {
                    GLTF1.GLTFLoaderExtension.LoadTextureAsync(gltfRuntime, material.values ? value : uniform.value, onLoadTexture(unif), function () { return onLoadTexture(null); });
                }
                // Others
                else {
                    if (uniform.value && GLTF1.GLTFUtils.SetUniform(shaderMaterial, unif, material.values ? value : uniform.value, type)) {
                        // Static uniform
                        delete unTreatedUniforms[unif];
                    }
                }
            }
        };
        /**
        * Shader compilation failed
        */
        var onShaderCompileError = function (program, shaderMaterial, onError) {
            return function (effect, error) {
                shaderMaterial.dispose(true);
                onError("Cannot compile program named " + program.name + ". Error: " + error + ". Default material will be applied");
            };
        };
        /**
        * Shader compilation success
        */
        var onShaderCompileSuccess = function (gltfRuntime, shaderMaterial, technique, material, unTreatedUniforms, onSuccess) {
            return function (_) {
                prepareShaderMaterialUniforms(gltfRuntime, shaderMaterial, technique, material, unTreatedUniforms);
                shaderMaterial.onBind = function (mesh) {
                    onBindShaderMaterial(mesh, gltfRuntime, unTreatedUniforms, shaderMaterial, technique, material, onSuccess);
                };
            };
        };
        /**
        * Returns the appropriate uniform if already handled by babylon
        */
        var parseShaderUniforms = function (tokenizer, technique, unTreatedUniforms) {
            for (var unif in technique.uniforms) {
                var uniform = technique.uniforms[unif];
                var uniformParameter = technique.parameters[uniform];
                if (tokenizer.currentIdentifier === unif) {
                    if (uniformParameter.semantic && !uniformParameter.source && !uniformParameter.node) {
                        var transformIndex = glTFTransforms.indexOf(uniformParameter.semantic);
                        if (transformIndex !== -1) {
                            delete unTreatedUniforms[unif];
                            return babylonTransforms[transformIndex];
                        }
                    }
                }
            }
            return tokenizer.currentIdentifier;
        };
        /**
        * All shaders loaded. Create materials one by one
        */
        var importMaterials = function (gltfRuntime) {
            // Create materials
            for (var mat in gltfRuntime.materials) {
                GLTF1.GLTFLoaderExtension.LoadMaterialAsync(gltfRuntime, mat, function (material) { }, function () { });
            }
        };
        /**
        * Implementation of the base glTF spec
        */
        var GLTFLoaderBase = /** @class */ (function () {
            function GLTFLoaderBase() {
            }
            GLTFLoaderBase.CreateRuntime = function (parsedData, scene, rootUrl) {
                var gltfRuntime = {
                    extensions: {},
                    accessors: {},
                    buffers: {},
                    bufferViews: {},
                    meshes: {},
                    lights: {},
                    cameras: {},
                    nodes: {},
                    images: {},
                    textures: {},
                    shaders: {},
                    programs: {},
                    samplers: {},
                    techniques: {},
                    materials: {},
                    animations: {},
                    skins: {},
                    extensionsUsed: [],
                    scenes: {},
                    buffersCount: 0,
                    shaderscount: 0,
                    scene: scene,
                    rootUrl: rootUrl,
                    loadedBufferCount: 0,
                    loadedBufferViews: {},
                    loadedShaderCount: 0,
                    importOnlyMeshes: false,
                    dummyNodes: []
                };
                // Parse
                if (parsedData.extensions) {
                    parseObject(parsedData.extensions, "extensions", gltfRuntime);
                }
                if (parsedData.extensionsUsed) {
                    parseObject(parsedData.extensionsUsed, "extensionsUsed", gltfRuntime);
                }
                if (parsedData.buffers) {
                    parseBuffers(parsedData.buffers, gltfRuntime);
                }
                if (parsedData.bufferViews) {
                    parseObject(parsedData.bufferViews, "bufferViews", gltfRuntime);
                }
                if (parsedData.accessors) {
                    parseObject(parsedData.accessors, "accessors", gltfRuntime);
                }
                if (parsedData.meshes) {
                    parseObject(parsedData.meshes, "meshes", gltfRuntime);
                }
                if (parsedData.lights) {
                    parseObject(parsedData.lights, "lights", gltfRuntime);
                }
                if (parsedData.cameras) {
                    parseObject(parsedData.cameras, "cameras", gltfRuntime);
                }
                if (parsedData.nodes) {
                    parseObject(parsedData.nodes, "nodes", gltfRuntime);
                }
                if (parsedData.images) {
                    parseObject(parsedData.images, "images", gltfRuntime);
                }
                if (parsedData.textures) {
                    parseObject(parsedData.textures, "textures", gltfRuntime);
                }
                if (parsedData.shaders) {
                    parseShaders(parsedData.shaders, gltfRuntime);
                }
                if (parsedData.programs) {
                    parseObject(parsedData.programs, "programs", gltfRuntime);
                }
                if (parsedData.samplers) {
                    parseObject(parsedData.samplers, "samplers", gltfRuntime);
                }
                if (parsedData.techniques) {
                    parseObject(parsedData.techniques, "techniques", gltfRuntime);
                }
                if (parsedData.materials) {
                    parseObject(parsedData.materials, "materials", gltfRuntime);
                }
                if (parsedData.animations) {
                    parseObject(parsedData.animations, "animations", gltfRuntime);
                }
                if (parsedData.skins) {
                    parseObject(parsedData.skins, "skins", gltfRuntime);
                }
                if (parsedData.scenes) {
                    gltfRuntime.scenes = parsedData.scenes;
                }
                if (parsedData.scene && parsedData.scenes) {
                    gltfRuntime.currentScene = parsedData.scenes[parsedData.scene];
                }
                return gltfRuntime;
            };
            GLTFLoaderBase.LoadBufferAsync = function (gltfRuntime, id, onSuccess, onError, onProgress) {
                var buffer = gltfRuntime.buffers[id];
                if (BABYLON.Tools.IsBase64(buffer.uri)) {
                    setTimeout(function () { return onSuccess(new Uint8Array(BABYLON.Tools.DecodeBase64(buffer.uri))); });
                }
                else {
                    BABYLON.Tools.LoadFile(gltfRuntime.rootUrl + buffer.uri, function (data) { return onSuccess(new Uint8Array(data)); }, onProgress, undefined, true, function (request) {
                        if (request) {
                            onError(request.status + " " + request.statusText);
                        }
                    });
                }
            };
            GLTFLoaderBase.LoadTextureBufferAsync = function (gltfRuntime, id, onSuccess, onError) {
                var texture = gltfRuntime.textures[id];
                if (!texture || !texture.source) {
                    onError("");
                    return;
                }
                if (texture.babylonTexture) {
                    onSuccess(null);
                    return;
                }
                var source = gltfRuntime.images[texture.source];
                if (BABYLON.Tools.IsBase64(source.uri)) {
                    setTimeout(function () { return onSuccess(new Uint8Array(BABYLON.Tools.DecodeBase64(source.uri))); });
                }
                else {
                    BABYLON.Tools.LoadFile(gltfRuntime.rootUrl + source.uri, function (data) { return onSuccess(new Uint8Array(data)); }, undefined, undefined, true, function (request) {
                        if (request) {
                            onError(request.status + " " + request.statusText);
                        }
                    });
                }
            };
            GLTFLoaderBase.CreateTextureAsync = function (gltfRuntime, id, buffer, onSuccess, onError) {
                var texture = gltfRuntime.textures[id];
                if (texture.babylonTexture) {
                    onSuccess(texture.babylonTexture);
                    return;
                }
                var sampler = gltfRuntime.samplers[texture.sampler];
                var createMipMaps = (sampler.minFilter === GLTF1.ETextureFilterType.NEAREST_MIPMAP_NEAREST) ||
                    (sampler.minFilter === GLTF1.ETextureFilterType.NEAREST_MIPMAP_LINEAR) ||
                    (sampler.minFilter === GLTF1.ETextureFilterType.LINEAR_MIPMAP_NEAREST) ||
                    (sampler.minFilter === GLTF1.ETextureFilterType.LINEAR_MIPMAP_LINEAR);
                var samplingMode = BABYLON.Texture.BILINEAR_SAMPLINGMODE;
                var blob = buffer == null ? new Blob() : new Blob([buffer]);
                var blobURL = URL.createObjectURL(blob);
                var revokeBlobURL = function () { return URL.revokeObjectURL(blobURL); };
                var newTexture = new BABYLON.Texture(blobURL, gltfRuntime.scene, !createMipMaps, true, samplingMode, revokeBlobURL, revokeBlobURL);
                if (sampler.wrapS !== undefined) {
                    newTexture.wrapU = GLTF1.GLTFUtils.GetWrapMode(sampler.wrapS);
                }
                if (sampler.wrapT !== undefined) {
                    newTexture.wrapV = GLTF1.GLTFUtils.GetWrapMode(sampler.wrapT);
                }
                newTexture.name = id;
                texture.babylonTexture = newTexture;
                onSuccess(newTexture);
            };
            GLTFLoaderBase.LoadShaderStringAsync = function (gltfRuntime, id, onSuccess, onError) {
                var shader = gltfRuntime.shaders[id];
                if (BABYLON.Tools.IsBase64(shader.uri)) {
                    var shaderString = atob(shader.uri.split(",")[1]);
                    if (onSuccess) {
                        onSuccess(shaderString);
                    }
                }
                else {
                    BABYLON.Tools.LoadFile(gltfRuntime.rootUrl + shader.uri, onSuccess, undefined, undefined, false, function (request) {
                        if (request && onError) {
                            onError(request.status + " " + request.statusText);
                        }
                    });
                }
            };
            GLTFLoaderBase.LoadMaterialAsync = function (gltfRuntime, id, onSuccess, onError) {
                var material = gltfRuntime.materials[id];
                if (!material.technique) {
                    if (onError) {
                        onError("No technique found.");
                    }
                    return;
                }
                var technique = gltfRuntime.techniques[material.technique];
                if (!technique) {
                    var defaultMaterial = new BABYLON.StandardMaterial(id, gltfRuntime.scene);
                    defaultMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                    defaultMaterial.sideOrientation = BABYLON.Material.CounterClockWiseSideOrientation;
                    onSuccess(defaultMaterial);
                    return;
                }
                var program = gltfRuntime.programs[technique.program];
                var states = technique.states;
                var vertexShader = BABYLON.Effect.ShadersStore[program.vertexShader + "VertexShader"];
                var pixelShader = BABYLON.Effect.ShadersStore[program.fragmentShader + "PixelShader"];
                var newVertexShader = "";
                var newPixelShader = "";
                var vertexTokenizer = new Tokenizer(vertexShader);
                var pixelTokenizer = new Tokenizer(pixelShader);
                var unTreatedUniforms = {};
                var uniforms = [];
                var attributes = [];
                var samplers = [];
                // Fill uniform, sampler2D and attributes
                for (var unif in technique.uniforms) {
                    var uniform = technique.uniforms[unif];
                    var uniformParameter = technique.parameters[uniform];
                    unTreatedUniforms[unif] = uniformParameter;
                    if (uniformParameter.semantic && !uniformParameter.node && !uniformParameter.source) {
                        var transformIndex = glTFTransforms.indexOf(uniformParameter.semantic);
                        if (transformIndex !== -1) {
                            uniforms.push(babylonTransforms[transformIndex]);
                            delete unTreatedUniforms[unif];
                        }
                        else {
                            uniforms.push(unif);
                        }
                    }
                    else if (uniformParameter.type === GLTF1.EParameterType.SAMPLER_2D) {
                        samplers.push(unif);
                    }
                    else {
                        uniforms.push(unif);
                    }
                }
                for (var attr in technique.attributes) {
                    var attribute = technique.attributes[attr];
                    var attributeParameter = technique.parameters[attribute];
                    if (attributeParameter.semantic) {
                        var name_1 = getAttribute(attributeParameter);
                        if (name_1) {
                            attributes.push(name_1);
                        }
                    }
                }
                // Configure vertex shader
                while (!vertexTokenizer.isEnd() && vertexTokenizer.getNextToken()) {
                    var tokenType = vertexTokenizer.currentToken;
                    if (tokenType !== ETokenType.IDENTIFIER) {
                        newVertexShader += vertexTokenizer.currentString;
                        continue;
                    }
                    var foundAttribute = false;
                    for (var attr in technique.attributes) {
                        var attribute = technique.attributes[attr];
                        var attributeParameter = technique.parameters[attribute];
                        if (vertexTokenizer.currentIdentifier === attr && attributeParameter.semantic) {
                            newVertexShader += getAttribute(attributeParameter);
                            foundAttribute = true;
                            break;
                        }
                    }
                    if (foundAttribute) {
                        continue;
                    }
                    newVertexShader += parseShaderUniforms(vertexTokenizer, technique, unTreatedUniforms);
                }
                // Configure pixel shader
                while (!pixelTokenizer.isEnd() && pixelTokenizer.getNextToken()) {
                    var tokenType = pixelTokenizer.currentToken;
                    if (tokenType !== ETokenType.IDENTIFIER) {
                        newPixelShader += pixelTokenizer.currentString;
                        continue;
                    }
                    newPixelShader += parseShaderUniforms(pixelTokenizer, technique, unTreatedUniforms);
                }
                // Create shader material
                var shaderPath = {
                    vertex: program.vertexShader + id,
                    fragment: program.fragmentShader + id
                };
                var options = {
                    attributes: attributes,
                    uniforms: uniforms,
                    samplers: samplers,
                    needAlphaBlending: states && states.enable && states.enable.indexOf(3042) !== -1
                };
                BABYLON.Effect.ShadersStore[program.vertexShader + id + "VertexShader"] = newVertexShader;
                BABYLON.Effect.ShadersStore[program.fragmentShader + id + "PixelShader"] = newPixelShader;
                var shaderMaterial = new BABYLON.ShaderMaterial(id, gltfRuntime.scene, shaderPath, options);
                shaderMaterial.onError = onShaderCompileError(program, shaderMaterial, onError);
                shaderMaterial.onCompiled = onShaderCompileSuccess(gltfRuntime, shaderMaterial, technique, material, unTreatedUniforms, onSuccess);
                shaderMaterial.sideOrientation = BABYLON.Material.CounterClockWiseSideOrientation;
                if (states && states.functions) {
                    var functions = states.functions;
                    if (functions.cullFace && functions.cullFace[0] !== GLTF1.ECullingType.BACK) {
                        shaderMaterial.backFaceCulling = false;
                    }
                    var blendFunc = functions.blendFuncSeparate;
                    if (blendFunc) {
                        if (blendFunc[0] === GLTF1.EBlendingFunction.SRC_ALPHA && blendFunc[1] === GLTF1.EBlendingFunction.ONE_MINUS_SRC_ALPHA && blendFunc[2] === GLTF1.EBlendingFunction.ONE && blendFunc[3] === GLTF1.EBlendingFunction.ONE) {
                            shaderMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
                        }
                        else if (blendFunc[0] === GLTF1.EBlendingFunction.ONE && blendFunc[1] === GLTF1.EBlendingFunction.ONE && blendFunc[2] === GLTF1.EBlendingFunction.ZERO && blendFunc[3] === GLTF1.EBlendingFunction.ONE) {
                            shaderMaterial.alphaMode = BABYLON.Engine.ALPHA_ONEONE;
                        }
                        else if (blendFunc[0] === GLTF1.EBlendingFunction.SRC_ALPHA && blendFunc[1] === GLTF1.EBlendingFunction.ONE && blendFunc[2] === GLTF1.EBlendingFunction.ZERO && blendFunc[3] === GLTF1.EBlendingFunction.ONE) {
                            shaderMaterial.alphaMode = BABYLON.Engine.ALPHA_ADD;
                        }
                        else if (blendFunc[0] === GLTF1.EBlendingFunction.ZERO && blendFunc[1] === GLTF1.EBlendingFunction.ONE_MINUS_SRC_COLOR && blendFunc[2] === GLTF1.EBlendingFunction.ONE && blendFunc[3] === GLTF1.EBlendingFunction.ONE) {
                            shaderMaterial.alphaMode = BABYLON.Engine.ALPHA_SUBTRACT;
                        }
                        else if (blendFunc[0] === GLTF1.EBlendingFunction.DST_COLOR && blendFunc[1] === GLTF1.EBlendingFunction.ZERO && blendFunc[2] === GLTF1.EBlendingFunction.ONE && blendFunc[3] === GLTF1.EBlendingFunction.ONE) {
                            shaderMaterial.alphaMode = BABYLON.Engine.ALPHA_MULTIPLY;
                        }
                        else if (blendFunc[0] === GLTF1.EBlendingFunction.SRC_ALPHA && blendFunc[1] === GLTF1.EBlendingFunction.ONE_MINUS_SRC_COLOR && blendFunc[2] === GLTF1.EBlendingFunction.ONE && blendFunc[3] === GLTF1.EBlendingFunction.ONE) {
                            shaderMaterial.alphaMode = BABYLON.Engine.ALPHA_MAXIMIZED;
                        }
                    }
                }
            };
            return GLTFLoaderBase;
        }());
        GLTF1.GLTFLoaderBase = GLTFLoaderBase;
        /**
        * glTF V1 Loader
        */
        var GLTFLoader = /** @class */ (function () {
            function GLTFLoader() {
                this.state = null;
            }
            GLTFLoader.RegisterExtension = function (extension) {
                if (GLTFLoader.Extensions[extension.name]) {
                    BABYLON.Tools.Error("Tool with the same name \"" + extension.name + "\" already exists");
                    return;
                }
                GLTFLoader.Extensions[extension.name] = extension;
            };
            GLTFLoader.prototype.dispose = function () {
                // do nothing
            };
            GLTFLoader.prototype._importMeshAsync = function (meshesNames, scene, data, rootUrl, onSuccess, onProgress, onError) {
                var _this = this;
                scene.useRightHandedSystem = true;
                GLTF1.GLTFLoaderExtension.LoadRuntimeAsync(scene, data, rootUrl, function (gltfRuntime) {
                    gltfRuntime.importOnlyMeshes = true;
                    if (meshesNames === "") {
                        gltfRuntime.importMeshesNames = [];
                    }
                    else if (typeof meshesNames === "string") {
                        gltfRuntime.importMeshesNames = [meshesNames];
                    }
                    else if (meshesNames && !(meshesNames instanceof Array)) {
                        gltfRuntime.importMeshesNames = [meshesNames];
                    }
                    else {
                        gltfRuntime.importMeshesNames = [];
                        BABYLON.Tools.Warn("Argument meshesNames must be of type string or string[]");
                    }
                    // Create nodes
                    _this._createNodes(gltfRuntime);
                    var meshes = new Array();
                    var skeletons = new Array();
                    // Fill arrays of meshes and skeletons
                    for (var nde in gltfRuntime.nodes) {
                        var node = gltfRuntime.nodes[nde];
                        if (node.babylonNode instanceof BABYLON.AbstractMesh) {
                            meshes.push(node.babylonNode);
                        }
                    }
                    for (var skl in gltfRuntime.skins) {
                        var skin = gltfRuntime.skins[skl];
                        if (skin.babylonSkeleton instanceof BABYLON.Skeleton) {
                            skeletons.push(skin.babylonSkeleton);
                        }
                    }
                    // Load buffers, shaders, materials, etc.
                    _this._loadBuffersAsync(gltfRuntime, function () {
                        _this._loadShadersAsync(gltfRuntime, function () {
                            importMaterials(gltfRuntime);
                            postLoad(gltfRuntime);
                            if (!BABYLON.GLTFFileLoader.IncrementalLoading && onSuccess) {
                                onSuccess(meshes, skeletons);
                            }
                        });
                    }, onProgress);
                    if (BABYLON.GLTFFileLoader.IncrementalLoading && onSuccess) {
                        onSuccess(meshes, skeletons);
                    }
                }, onError);
                return true;
            };
            /**
            * Imports one or more meshes from a loaded gltf file and adds them to the scene
            * @param meshesNames a string or array of strings of the mesh names that should be loaded from the file
            * @param scene the scene the meshes should be added to
            * @param data gltf data containing information of the meshes in a loaded file
            * @param rootUrl root url to load from
            * @param onProgress event that fires when loading progress has occured
            * @returns a promise containg the loaded meshes, particles, skeletons and animations
            */
            GLTFLoader.prototype.importMeshAsync = function (meshesNames, scene, data, rootUrl, onProgress) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    _this._importMeshAsync(meshesNames, scene, data, rootUrl, function (meshes, skeletons) {
                        resolve({
                            meshes: meshes,
                            particleSystems: [],
                            skeletons: skeletons,
                            animationGroups: []
                        });
                    }, onProgress, function (message) {
                        reject(new Error(message));
                    });
                });
            };
            GLTFLoader.prototype._loadAsync = function (scene, data, rootUrl, onSuccess, onProgress, onError) {
                var _this = this;
                scene.useRightHandedSystem = true;
                GLTF1.GLTFLoaderExtension.LoadRuntimeAsync(scene, data, rootUrl, function (gltfRuntime) {
                    // Load runtime extensios
                    GLTF1.GLTFLoaderExtension.LoadRuntimeExtensionsAsync(gltfRuntime, function () {
                        // Create nodes
                        _this._createNodes(gltfRuntime);
                        // Load buffers, shaders, materials, etc.
                        _this._loadBuffersAsync(gltfRuntime, function () {
                            _this._loadShadersAsync(gltfRuntime, function () {
                                importMaterials(gltfRuntime);
                                postLoad(gltfRuntime);
                                if (!BABYLON.GLTFFileLoader.IncrementalLoading) {
                                    onSuccess();
                                }
                            });
                        });
                        if (BABYLON.GLTFFileLoader.IncrementalLoading) {
                            onSuccess();
                        }
                    }, onError);
                }, onError);
            };
            /**
            * Imports all objects from a loaded gltf file and adds them to the scene
            * @param scene the scene the objects should be added to
            * @param data gltf data containing information of the meshes in a loaded file
            * @param rootUrl root url to load from
            * @param onProgress event that fires when loading progress has occured
            * @returns a promise which completes when objects have been loaded to the scene
            */
            GLTFLoader.prototype.loadAsync = function (scene, data, rootUrl, onProgress) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    _this._loadAsync(scene, data, rootUrl, function () {
                        resolve();
                    }, onProgress, function (message) {
                        reject(new Error(message));
                    });
                });
            };
            GLTFLoader.prototype._loadShadersAsync = function (gltfRuntime, onload) {
                var hasShaders = false;
                var processShader = function (sha, shader) {
                    GLTF1.GLTFLoaderExtension.LoadShaderStringAsync(gltfRuntime, sha, function (shaderString) {
                        if (shaderString instanceof ArrayBuffer) {
                            return;
                        }
                        gltfRuntime.loadedShaderCount++;
                        if (shaderString) {
                            BABYLON.Effect.ShadersStore[sha + (shader.type === GLTF1.EShaderType.VERTEX ? "VertexShader" : "PixelShader")] = shaderString;
                        }
                        if (gltfRuntime.loadedShaderCount === gltfRuntime.shaderscount) {
                            onload();
                        }
                    }, function () {
                        BABYLON.Tools.Error("Error when loading shader program named " + sha + " located at " + shader.uri);
                    });
                };
                for (var sha in gltfRuntime.shaders) {
                    hasShaders = true;
                    var shader = gltfRuntime.shaders[sha];
                    if (shader) {
                        processShader.bind(this, sha, shader)();
                    }
                    else {
                        BABYLON.Tools.Error("No shader named: " + sha);
                    }
                }
                if (!hasShaders) {
                    onload();
                }
            };
            GLTFLoader.prototype._loadBuffersAsync = function (gltfRuntime, onLoad, onProgress) {
                var hasBuffers = false;
                var processBuffer = function (buf, buffer) {
                    GLTF1.GLTFLoaderExtension.LoadBufferAsync(gltfRuntime, buf, function (bufferView) {
                        gltfRuntime.loadedBufferCount++;
                        if (bufferView) {
                            if (bufferView.byteLength != gltfRuntime.buffers[buf].byteLength) {
                                BABYLON.Tools.Error("Buffer named " + buf + " is length " + bufferView.byteLength + ". Expected: " + buffer.byteLength); // Improve error message
                            }
                            gltfRuntime.loadedBufferViews[buf] = bufferView;
                        }
                        if (gltfRuntime.loadedBufferCount === gltfRuntime.buffersCount) {
                            onLoad();
                        }
                    }, function () {
                        BABYLON.Tools.Error("Error when loading buffer named " + buf + " located at " + buffer.uri);
                    });
                };
                for (var buf in gltfRuntime.buffers) {
                    hasBuffers = true;
                    var buffer = gltfRuntime.buffers[buf];
                    if (buffer) {
                        processBuffer.bind(this, buf, buffer)();
                    }
                    else {
                        BABYLON.Tools.Error("No buffer named: " + buf);
                    }
                }
                if (!hasBuffers) {
                    onLoad();
                }
            };
            GLTFLoader.prototype._createNodes = function (gltfRuntime) {
                var currentScene = gltfRuntime.currentScene;
                if (currentScene) {
                    // Only one scene even if multiple scenes are defined
                    for (var i = 0; i < currentScene.nodes.length; i++) {
                        traverseNodes(gltfRuntime, currentScene.nodes[i], null);
                    }
                }
                else {
                    // Load all scenes
                    for (var thing in gltfRuntime.scenes) {
                        currentScene = gltfRuntime.scenes[thing];
                        for (var i = 0; i < currentScene.nodes.length; i++) {
                            traverseNodes(gltfRuntime, currentScene.nodes[i], null);
                        }
                    }
                }
            };
            GLTFLoader.Extensions = {};
            return GLTFLoader;
        }());
        GLTF1.GLTFLoader = GLTFLoader;
        BABYLON.GLTFFileLoader._CreateGLTFLoaderV1 = function () { return new GLTFLoader(); };
    })(GLTF1 = BABYLON.GLTF1 || (BABYLON.GLTF1 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFLoader.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF1;
    (function (GLTF1) {
        /**
        * Utils functions for GLTF
        */
        var GLTFUtils = /** @class */ (function () {
            function GLTFUtils() {
            }
            /**
             * Sets the given "parameter" matrix
             * @param scene: the Scene object
             * @param source: the source node where to pick the matrix
             * @param parameter: the GLTF technique parameter
             * @param uniformName: the name of the shader's uniform
             * @param shaderMaterial: the shader material
             */
            GLTFUtils.SetMatrix = function (scene, source, parameter, uniformName, shaderMaterial) {
                var mat = null;
                if (parameter.semantic === "MODEL") {
                    mat = source.getWorldMatrix();
                }
                else if (parameter.semantic === "PROJECTION") {
                    mat = scene.getProjectionMatrix();
                }
                else if (parameter.semantic === "VIEW") {
                    mat = scene.getViewMatrix();
                }
                else if (parameter.semantic === "MODELVIEWINVERSETRANSPOSE") {
                    mat = BABYLON.Matrix.Transpose(source.getWorldMatrix().multiply(scene.getViewMatrix()).invert());
                }
                else if (parameter.semantic === "MODELVIEW") {
                    mat = source.getWorldMatrix().multiply(scene.getViewMatrix());
                }
                else if (parameter.semantic === "MODELVIEWPROJECTION") {
                    mat = source.getWorldMatrix().multiply(scene.getTransformMatrix());
                }
                else if (parameter.semantic === "MODELINVERSE") {
                    mat = source.getWorldMatrix().invert();
                }
                else if (parameter.semantic === "VIEWINVERSE") {
                    mat = scene.getViewMatrix().invert();
                }
                else if (parameter.semantic === "PROJECTIONINVERSE") {
                    mat = scene.getProjectionMatrix().invert();
                }
                else if (parameter.semantic === "MODELVIEWINVERSE") {
                    mat = source.getWorldMatrix().multiply(scene.getViewMatrix()).invert();
                }
                else if (parameter.semantic === "MODELVIEWPROJECTIONINVERSE") {
                    mat = source.getWorldMatrix().multiply(scene.getTransformMatrix()).invert();
                }
                else if (parameter.semantic === "MODELINVERSETRANSPOSE") {
                    mat = BABYLON.Matrix.Transpose(source.getWorldMatrix().invert());
                }
                else {
                    debugger;
                }
                if (mat) {
                    switch (parameter.type) {
                        case GLTF1.EParameterType.FLOAT_MAT2:
                            shaderMaterial.setMatrix2x2(uniformName, BABYLON.Matrix.GetAsMatrix2x2(mat));
                            break;
                        case GLTF1.EParameterType.FLOAT_MAT3:
                            shaderMaterial.setMatrix3x3(uniformName, BABYLON.Matrix.GetAsMatrix3x3(mat));
                            break;
                        case GLTF1.EParameterType.FLOAT_MAT4:
                            shaderMaterial.setMatrix(uniformName, mat);
                            break;
                        default: break;
                    }
                }
            };
            /**
             * Sets the given "parameter" matrix
             * @param shaderMaterial: the shader material
             * @param uniform: the name of the shader's uniform
             * @param value: the value of the uniform
             * @param type: the uniform's type (EParameterType FLOAT, VEC2, VEC3 or VEC4)
             */
            GLTFUtils.SetUniform = function (shaderMaterial, uniform, value, type) {
                switch (type) {
                    case GLTF1.EParameterType.FLOAT:
                        shaderMaterial.setFloat(uniform, value);
                        return true;
                    case GLTF1.EParameterType.FLOAT_VEC2:
                        shaderMaterial.setVector2(uniform, BABYLON.Vector2.FromArray(value));
                        return true;
                    case GLTF1.EParameterType.FLOAT_VEC3:
                        shaderMaterial.setVector3(uniform, BABYLON.Vector3.FromArray(value));
                        return true;
                    case GLTF1.EParameterType.FLOAT_VEC4:
                        shaderMaterial.setVector4(uniform, BABYLON.Vector4.FromArray(value));
                        return true;
                    default: return false;
                }
            };
            /**
            * Returns the wrap mode of the texture
            * @param mode: the mode value
            */
            GLTFUtils.GetWrapMode = function (mode) {
                switch (mode) {
                    case GLTF1.ETextureWrapMode.CLAMP_TO_EDGE: return BABYLON.Texture.CLAMP_ADDRESSMODE;
                    case GLTF1.ETextureWrapMode.MIRRORED_REPEAT: return BABYLON.Texture.MIRROR_ADDRESSMODE;
                    case GLTF1.ETextureWrapMode.REPEAT: return BABYLON.Texture.WRAP_ADDRESSMODE;
                    default: return BABYLON.Texture.WRAP_ADDRESSMODE;
                }
            };
            /**
             * Returns the byte stride giving an accessor
             * @param accessor: the GLTF accessor objet
             */
            GLTFUtils.GetByteStrideFromType = function (accessor) {
                // Needs this function since "byteStride" isn't requiered in glTF format
                var type = accessor.type;
                switch (type) {
                    case "VEC2": return 2;
                    case "VEC3": return 3;
                    case "VEC4": return 4;
                    case "MAT2": return 4;
                    case "MAT3": return 9;
                    case "MAT4": return 16;
                    default: return 1;
                }
            };
            /**
             * Returns the texture filter mode giving a mode value
             * @param mode: the filter mode value
             */
            GLTFUtils.GetTextureFilterMode = function (mode) {
                switch (mode) {
                    case GLTF1.ETextureFilterType.LINEAR:
                    case GLTF1.ETextureFilterType.LINEAR_MIPMAP_NEAREST:
                    case GLTF1.ETextureFilterType.LINEAR_MIPMAP_LINEAR: return BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
                    case GLTF1.ETextureFilterType.NEAREST:
                    case GLTF1.ETextureFilterType.NEAREST_MIPMAP_NEAREST: return BABYLON.Texture.NEAREST_SAMPLINGMODE;
                    default: return BABYLON.Texture.BILINEAR_SAMPLINGMODE;
                }
            };
            GLTFUtils.GetBufferFromBufferView = function (gltfRuntime, bufferView, byteOffset, byteLength, componentType) {
                var byteOffset = bufferView.byteOffset + byteOffset;
                var loadedBufferView = gltfRuntime.loadedBufferViews[bufferView.buffer];
                if (byteOffset + byteLength > loadedBufferView.byteLength) {
                    throw new Error("Buffer access is out of range");
                }
                var buffer = loadedBufferView.buffer;
                byteOffset += loadedBufferView.byteOffset;
                switch (componentType) {
                    case GLTF1.EComponentType.BYTE: return new Int8Array(buffer, byteOffset, byteLength);
                    case GLTF1.EComponentType.UNSIGNED_BYTE: return new Uint8Array(buffer, byteOffset, byteLength);
                    case GLTF1.EComponentType.SHORT: return new Int16Array(buffer, byteOffset, byteLength);
                    case GLTF1.EComponentType.UNSIGNED_SHORT: return new Uint16Array(buffer, byteOffset, byteLength);
                    default: return new Float32Array(buffer, byteOffset, byteLength);
                }
            };
            /**
             * Returns a buffer from its accessor
             * @param gltfRuntime: the GLTF runtime
             * @param accessor: the GLTF accessor
             */
            GLTFUtils.GetBufferFromAccessor = function (gltfRuntime, accessor) {
                var bufferView = gltfRuntime.bufferViews[accessor.bufferView];
                var byteLength = accessor.count * GLTFUtils.GetByteStrideFromType(accessor);
                return GLTFUtils.GetBufferFromBufferView(gltfRuntime, bufferView, accessor.byteOffset, byteLength, accessor.componentType);
            };
            /**
             * Decodes a buffer view into a string
             * @param view: the buffer view
             */
            GLTFUtils.DecodeBufferToText = function (view) {
                var result = "";
                var length = view.byteLength;
                for (var i = 0; i < length; ++i) {
                    result += String.fromCharCode(view[i]);
                }
                return result;
            };
            /**
             * Returns the default material of gltf. Related to
             * https://github.com/KhronosGroup/glTF/tree/master/specification/1.0#appendix-a-default-material
             * @param scene: the Babylon.js scene
             */
            GLTFUtils.GetDefaultMaterial = function (scene) {
                if (!GLTFUtils._DefaultMaterial) {
                    BABYLON.Effect.ShadersStore["GLTFDefaultMaterialVertexShader"] = [
                        "precision highp float;",
                        "",
                        "uniform mat4 worldView;",
                        "uniform mat4 projection;",
                        "",
                        "attribute vec3 position;",
                        "",
                        "void main(void)",
                        "{",
                        "    gl_Position = projection * worldView * vec4(position, 1.0);",
                        "}"
                    ].join("\n");
                    BABYLON.Effect.ShadersStore["GLTFDefaultMaterialPixelShader"] = [
                        "precision highp float;",
                        "",
                        "uniform vec4 u_emission;",
                        "",
                        "void main(void)",
                        "{",
                        "    gl_FragColor = u_emission;",
                        "}"
                    ].join("\n");
                    var shaderPath = {
                        vertex: "GLTFDefaultMaterial",
                        fragment: "GLTFDefaultMaterial"
                    };
                    var options = {
                        attributes: ["position"],
                        uniforms: ["worldView", "projection", "u_emission"],
                        samplers: new Array(),
                        needAlphaBlending: false
                    };
                    GLTFUtils._DefaultMaterial = new BABYLON.ShaderMaterial("GLTFDefaultMaterial", scene, shaderPath, options);
                    GLTFUtils._DefaultMaterial.setColor4("u_emission", new BABYLON.Color4(0.5, 0.5, 0.5, 1.0));
                }
                return GLTFUtils._DefaultMaterial;
            };
            // The GLTF default material
            GLTFUtils._DefaultMaterial = null;
            return GLTFUtils;
        }());
        GLTF1.GLTFUtils = GLTFUtils;
    })(GLTF1 = BABYLON.GLTF1 || (BABYLON.GLTF1 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFLoaderUtils.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF1;
    (function (GLTF1) {
        var GLTFLoaderExtension = /** @class */ (function () {
            function GLTFLoaderExtension(name) {
                this._name = name;
            }
            Object.defineProperty(GLTFLoaderExtension.prototype, "name", {
                get: function () {
                    return this._name;
                },
                enumerable: true,
                configurable: true
            });
            /**
            * Defines an override for loading the runtime
            * Return true to stop further extensions from loading the runtime
            */
            GLTFLoaderExtension.prototype.loadRuntimeAsync = function (scene, data, rootUrl, onSuccess, onError) {
                return false;
            };
            /**
             * Defines an onverride for creating gltf runtime
             * Return true to stop further extensions from creating the runtime
             */
            GLTFLoaderExtension.prototype.loadRuntimeExtensionsAsync = function (gltfRuntime, onSuccess, onError) {
                return false;
            };
            /**
            * Defines an override for loading buffers
            * Return true to stop further extensions from loading this buffer
            */
            GLTFLoaderExtension.prototype.loadBufferAsync = function (gltfRuntime, id, onSuccess, onError, onProgress) {
                return false;
            };
            /**
            * Defines an override for loading texture buffers
            * Return true to stop further extensions from loading this texture data
            */
            GLTFLoaderExtension.prototype.loadTextureBufferAsync = function (gltfRuntime, id, onSuccess, onError) {
                return false;
            };
            /**
            * Defines an override for creating textures
            * Return true to stop further extensions from loading this texture
            */
            GLTFLoaderExtension.prototype.createTextureAsync = function (gltfRuntime, id, buffer, onSuccess, onError) {
                return false;
            };
            /**
            * Defines an override for loading shader strings
            * Return true to stop further extensions from loading this shader data
            */
            GLTFLoaderExtension.prototype.loadShaderStringAsync = function (gltfRuntime, id, onSuccess, onError) {
                return false;
            };
            /**
            * Defines an override for loading materials
            * Return true to stop further extensions from loading this material
            */
            GLTFLoaderExtension.prototype.loadMaterialAsync = function (gltfRuntime, id, onSuccess, onError) {
                return false;
            };
            // ---------
            // Utilities
            // ---------
            GLTFLoaderExtension.LoadRuntimeAsync = function (scene, data, rootUrl, onSuccess, onError) {
                GLTFLoaderExtension.ApplyExtensions(function (loaderExtension) {
                    return loaderExtension.loadRuntimeAsync(scene, data, rootUrl, onSuccess, onError);
                }, function () {
                    setTimeout(function () {
                        if (!onSuccess) {
                            return;
                        }
                        onSuccess(GLTF1.GLTFLoaderBase.CreateRuntime(data.json, scene, rootUrl));
                    });
                });
            };
            GLTFLoaderExtension.LoadRuntimeExtensionsAsync = function (gltfRuntime, onSuccess, onError) {
                GLTFLoaderExtension.ApplyExtensions(function (loaderExtension) {
                    return loaderExtension.loadRuntimeExtensionsAsync(gltfRuntime, onSuccess, onError);
                }, function () {
                    setTimeout(function () {
                        onSuccess();
                    });
                });
            };
            GLTFLoaderExtension.LoadBufferAsync = function (gltfRuntime, id, onSuccess, onError, onProgress) {
                GLTFLoaderExtension.ApplyExtensions(function (loaderExtension) {
                    return loaderExtension.loadBufferAsync(gltfRuntime, id, onSuccess, onError, onProgress);
                }, function () {
                    GLTF1.GLTFLoaderBase.LoadBufferAsync(gltfRuntime, id, onSuccess, onError, onProgress);
                });
            };
            GLTFLoaderExtension.LoadTextureAsync = function (gltfRuntime, id, onSuccess, onError) {
                GLTFLoaderExtension.LoadTextureBufferAsync(gltfRuntime, id, function (buffer) {
                    if (buffer) {
                        GLTFLoaderExtension.CreateTextureAsync(gltfRuntime, id, buffer, onSuccess, onError);
                    }
                }, onError);
            };
            GLTFLoaderExtension.LoadShaderStringAsync = function (gltfRuntime, id, onSuccess, onError) {
                GLTFLoaderExtension.ApplyExtensions(function (loaderExtension) {
                    return loaderExtension.loadShaderStringAsync(gltfRuntime, id, onSuccess, onError);
                }, function () {
                    GLTF1.GLTFLoaderBase.LoadShaderStringAsync(gltfRuntime, id, onSuccess, onError);
                });
            };
            GLTFLoaderExtension.LoadMaterialAsync = function (gltfRuntime, id, onSuccess, onError) {
                GLTFLoaderExtension.ApplyExtensions(function (loaderExtension) {
                    return loaderExtension.loadMaterialAsync(gltfRuntime, id, onSuccess, onError);
                }, function () {
                    GLTF1.GLTFLoaderBase.LoadMaterialAsync(gltfRuntime, id, onSuccess, onError);
                });
            };
            GLTFLoaderExtension.LoadTextureBufferAsync = function (gltfRuntime, id, onSuccess, onError) {
                GLTFLoaderExtension.ApplyExtensions(function (loaderExtension) {
                    return loaderExtension.loadTextureBufferAsync(gltfRuntime, id, onSuccess, onError);
                }, function () {
                    GLTF1.GLTFLoaderBase.LoadTextureBufferAsync(gltfRuntime, id, onSuccess, onError);
                });
            };
            GLTFLoaderExtension.CreateTextureAsync = function (gltfRuntime, id, buffer, onSuccess, onError) {
                GLTFLoaderExtension.ApplyExtensions(function (loaderExtension) {
                    return loaderExtension.createTextureAsync(gltfRuntime, id, buffer, onSuccess, onError);
                }, function () {
                    GLTF1.GLTFLoaderBase.CreateTextureAsync(gltfRuntime, id, buffer, onSuccess, onError);
                });
            };
            GLTFLoaderExtension.ApplyExtensions = function (func, defaultFunc) {
                for (var extensionName in GLTF1.GLTFLoader.Extensions) {
                    var loaderExtension = GLTF1.GLTFLoader.Extensions[extensionName];
                    if (func(loaderExtension)) {
                        return;
                    }
                }
                defaultFunc();
            };
            return GLTFLoaderExtension;
        }());
        GLTF1.GLTFLoaderExtension = GLTFLoaderExtension;
    })(GLTF1 = BABYLON.GLTF1 || (BABYLON.GLTF1 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFLoaderExtension.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var BABYLON;
(function (BABYLON) {
    var GLTF1;
    (function (GLTF1) {
        var BinaryExtensionBufferName = "binary_glTF";
        var GLTFBinaryExtension = /** @class */ (function (_super) {
            __extends(GLTFBinaryExtension, _super);
            function GLTFBinaryExtension() {
                return _super.call(this, "KHR_binary_glTF") || this;
            }
            GLTFBinaryExtension.prototype.loadRuntimeAsync = function (scene, data, rootUrl, onSuccess, onError) {
                var extensionsUsed = data.json.extensionsUsed;
                if (!extensionsUsed || extensionsUsed.indexOf(this.name) === -1 || !data.bin) {
                    return false;
                }
                this._bin = data.bin;
                onSuccess(GLTF1.GLTFLoaderBase.CreateRuntime(data.json, scene, rootUrl));
                return true;
            };
            GLTFBinaryExtension.prototype.loadBufferAsync = function (gltfRuntime, id, onSuccess, onError) {
                if (gltfRuntime.extensionsUsed.indexOf(this.name) === -1) {
                    return false;
                }
                if (id !== BinaryExtensionBufferName) {
                    return false;
                }
                onSuccess(this._bin);
                return true;
            };
            GLTFBinaryExtension.prototype.loadTextureBufferAsync = function (gltfRuntime, id, onSuccess, onError) {
                var texture = gltfRuntime.textures[id];
                var source = gltfRuntime.images[texture.source];
                if (!source.extensions || !(this.name in source.extensions)) {
                    return false;
                }
                var sourceExt = source.extensions[this.name];
                var bufferView = gltfRuntime.bufferViews[sourceExt.bufferView];
                var buffer = GLTF1.GLTFUtils.GetBufferFromBufferView(gltfRuntime, bufferView, 0, bufferView.byteLength, GLTF1.EComponentType.UNSIGNED_BYTE);
                onSuccess(buffer);
                return true;
            };
            GLTFBinaryExtension.prototype.loadShaderStringAsync = function (gltfRuntime, id, onSuccess, onError) {
                var shader = gltfRuntime.shaders[id];
                if (!shader.extensions || !(this.name in shader.extensions)) {
                    return false;
                }
                var binaryExtensionShader = shader.extensions[this.name];
                var bufferView = gltfRuntime.bufferViews[binaryExtensionShader.bufferView];
                var shaderBytes = GLTF1.GLTFUtils.GetBufferFromBufferView(gltfRuntime, bufferView, 0, bufferView.byteLength, GLTF1.EComponentType.UNSIGNED_BYTE);
                setTimeout(function () {
                    var shaderString = GLTF1.GLTFUtils.DecodeBufferToText(shaderBytes);
                    onSuccess(shaderString);
                });
                return true;
            };
            return GLTFBinaryExtension;
        }(GLTF1.GLTFLoaderExtension));
        GLTF1.GLTFBinaryExtension = GLTFBinaryExtension;
        GLTF1.GLTFLoader.RegisterExtension(new GLTFBinaryExtension());
    })(GLTF1 = BABYLON.GLTF1 || (BABYLON.GLTF1 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFBinaryExtension.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var BABYLON;
(function (BABYLON) {
    var GLTF1;
    (function (GLTF1) {
        var GLTFMaterialsCommonExtension = /** @class */ (function (_super) {
            __extends(GLTFMaterialsCommonExtension, _super);
            function GLTFMaterialsCommonExtension() {
                return _super.call(this, "KHR_materials_common") || this;
            }
            GLTFMaterialsCommonExtension.prototype.loadRuntimeExtensionsAsync = function (gltfRuntime, onSuccess, onError) {
                if (!gltfRuntime.extensions) {
                    return false;
                }
                var extension = gltfRuntime.extensions[this.name];
                if (!extension) {
                    return false;
                }
                // Create lights
                var lights = extension.lights;
                if (lights) {
                    for (var thing in lights) {
                        var light = lights[thing];
                        switch (light.type) {
                            case "ambient":
                                var ambientLight = new BABYLON.HemisphericLight(light.name, new BABYLON.Vector3(0, 1, 0), gltfRuntime.scene);
                                var ambient = light.ambient;
                                if (ambient) {
                                    ambientLight.diffuse = BABYLON.Color3.FromArray(ambient.color || [1, 1, 1]);
                                }
                                break;
                            case "point":
                                var pointLight = new BABYLON.PointLight(light.name, new BABYLON.Vector3(10, 10, 10), gltfRuntime.scene);
                                var point = light.point;
                                if (point) {
                                    pointLight.diffuse = BABYLON.Color3.FromArray(point.color || [1, 1, 1]);
                                }
                                break;
                            case "directional":
                                var dirLight = new BABYLON.DirectionalLight(light.name, new BABYLON.Vector3(0, -1, 0), gltfRuntime.scene);
                                var directional = light.directional;
                                if (directional) {
                                    dirLight.diffuse = BABYLON.Color3.FromArray(directional.color || [1, 1, 1]);
                                }
                                break;
                            case "spot":
                                var spot = light.spot;
                                if (spot) {
                                    var spotLight = new BABYLON.SpotLight(light.name, new BABYLON.Vector3(0, 10, 0), new BABYLON.Vector3(0, -1, 0), spot.fallOffAngle || Math.PI, spot.fallOffExponent || 0.0, gltfRuntime.scene);
                                    spotLight.diffuse = BABYLON.Color3.FromArray(spot.color || [1, 1, 1]);
                                }
                                break;
                            default:
                                BABYLON.Tools.Warn("GLTF Material Common extension: light type \"" + light.type + "\” not supported");
                                break;
                        }
                    }
                }
                return false;
            };
            GLTFMaterialsCommonExtension.prototype.loadMaterialAsync = function (gltfRuntime, id, onSuccess, onError) {
                var material = gltfRuntime.materials[id];
                if (!material || !material.extensions) {
                    return false;
                }
                var extension = material.extensions[this.name];
                if (!extension) {
                    return false;
                }
                var standardMaterial = new BABYLON.StandardMaterial(id, gltfRuntime.scene);
                standardMaterial.sideOrientation = BABYLON.Material.CounterClockWiseSideOrientation;
                if (extension.technique === "CONSTANT") {
                    standardMaterial.disableLighting = true;
                }
                standardMaterial.backFaceCulling = extension.doubleSided === undefined ? false : !extension.doubleSided;
                standardMaterial.alpha = extension.values.transparency === undefined ? 1.0 : extension.values.transparency;
                standardMaterial.specularPower = extension.values.shininess === undefined ? 0.0 : extension.values.shininess;
                // Ambient
                if (typeof extension.values.ambient === "string") {
                    this._loadTexture(gltfRuntime, extension.values.ambient, standardMaterial, "ambientTexture", onError);
                }
                else {
                    standardMaterial.ambientColor = BABYLON.Color3.FromArray(extension.values.ambient || [0, 0, 0]);
                }
                // Diffuse
                if (typeof extension.values.diffuse === "string") {
                    this._loadTexture(gltfRuntime, extension.values.diffuse, standardMaterial, "diffuseTexture", onError);
                }
                else {
                    standardMaterial.diffuseColor = BABYLON.Color3.FromArray(extension.values.diffuse || [0, 0, 0]);
                }
                // Emission
                if (typeof extension.values.emission === "string") {
                    this._loadTexture(gltfRuntime, extension.values.emission, standardMaterial, "emissiveTexture", onError);
                }
                else {
                    standardMaterial.emissiveColor = BABYLON.Color3.FromArray(extension.values.emission || [0, 0, 0]);
                }
                // Specular
                if (typeof extension.values.specular === "string") {
                    this._loadTexture(gltfRuntime, extension.values.specular, standardMaterial, "specularTexture", onError);
                }
                else {
                    standardMaterial.specularColor = BABYLON.Color3.FromArray(extension.values.specular || [0, 0, 0]);
                }
                return true;
            };
            GLTFMaterialsCommonExtension.prototype._loadTexture = function (gltfRuntime, id, material, propertyPath, onError) {
                // Create buffer from texture url
                GLTF1.GLTFLoaderBase.LoadTextureBufferAsync(gltfRuntime, id, function (buffer) {
                    // Create texture from buffer
                    GLTF1.GLTFLoaderBase.CreateTextureAsync(gltfRuntime, id, buffer, function (texture) { return material[propertyPath] = texture; }, onError);
                }, onError);
            };
            return GLTFMaterialsCommonExtension;
        }(GLTF1.GLTFLoaderExtension));
        GLTF1.GLTFMaterialsCommonExtension = GLTFMaterialsCommonExtension;
        GLTF1.GLTFLoader.RegisterExtension(new GLTFMaterialsCommonExtension());
    })(GLTF1 = BABYLON.GLTF1 || (BABYLON.GLTF1 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFMaterialsCommonExtension.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>

//# sourceMappingURL=babylon.glTFLoaderInterfaces.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>
/**
 * Defines the module for importing and exporting glTF 2.0 assets
 */
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        /**
         * Helper class for working with arrays when loading the glTF asset
         */
        var ArrayItem = /** @class */ (function () {
            function ArrayItem() {
            }
            /**
             * Gets an item from the given array.
             * @param context The context when loading the asset
             * @param array The array to get the item from
             * @param index The index to the array
             * @returns The array item
             */
            ArrayItem.Get = function (context, array, index) {
                if (!array || index == undefined || !array[index]) {
                    throw new Error(context + ": Failed to find index (" + index + ")");
                }
                return array[index];
            };
            /**
             * Assign an `index` field to each item of the given array.
             * @param array The array of items
             */
            ArrayItem.Assign = function (array) {
                if (array) {
                    for (var index = 0; index < array.length; index++) {
                        array[index].index = index;
                    }
                }
            };
            return ArrayItem;
        }());
        GLTF2.ArrayItem = ArrayItem;
        /**
         * The glTF 2.0 loader
         */
        var GLTFLoader = /** @class */ (function () {
            /** @hidden */
            function GLTFLoader(parent) {
                /** @hidden */
                this._completePromises = new Array();
                this._disposed = false;
                this._state = null;
                this._extensions = {};
                this._defaultBabylonMaterialData = {};
                this._requests = new Array();
                this._parent = parent;
            }
            /**
             * Registers a loader extension.
             * @param name The name of the loader extension.
             * @param factory The factory function that creates the loader extension.
             */
            GLTFLoader.RegisterExtension = function (name, factory) {
                if (GLTFLoader.UnregisterExtension(name)) {
                    BABYLON.Tools.Warn("Extension with the name '" + name + "' already exists");
                }
                GLTFLoader._ExtensionFactories[name] = factory;
                // Keep the order of registration so that extensions registered first are called first.
                GLTFLoader._ExtensionNames.push(name);
            };
            /**
             * Unregisters a loader extension.
             * @param name The name of the loader extenion.
             * @returns A boolean indicating whether the extension has been unregistered
             */
            GLTFLoader.UnregisterExtension = function (name) {
                if (!GLTFLoader._ExtensionFactories[name]) {
                    return false;
                }
                delete GLTFLoader._ExtensionFactories[name];
                var index = GLTFLoader._ExtensionNames.indexOf(name);
                if (index !== -1) {
                    GLTFLoader._ExtensionNames.splice(index, 1);
                }
                return true;
            };
            Object.defineProperty(GLTFLoader.prototype, "state", {
                /**
                 * Gets the loader state.
                 */
                get: function () {
                    return this._state;
                },
                enumerable: true,
                configurable: true
            });
            /** @hidden */
            GLTFLoader.prototype.dispose = function () {
                if (this._disposed) {
                    return;
                }
                this._disposed = true;
                for (var _i = 0, _a = this._requests; _i < _a.length; _i++) {
                    var request = _a[_i];
                    request.abort();
                }
                this._requests.length = 0;
                delete this.gltf;
                delete this.babylonScene;
                this._completePromises.length = 0;
                for (var name_1 in this._extensions) {
                    var extension = this._extensions[name_1];
                    if (extension.dispose) {
                        this._extensions[name_1].dispose();
                    }
                }
                this._extensions = {};
                delete this._rootBabylonMesh;
                delete this._progressCallback;
                this._parent._clear();
            };
            /** @hidden */
            GLTFLoader.prototype.importMeshAsync = function (meshesNames, scene, data, rootUrl, onProgress, fileName) {
                var _this = this;
                return Promise.resolve().then(function () {
                    _this.babylonScene = scene;
                    _this._rootUrl = rootUrl;
                    _this._fileName = fileName || "scene";
                    _this._progressCallback = onProgress;
                    _this._loadData(data);
                    var nodes = null;
                    if (meshesNames) {
                        var nodeMap_1 = {};
                        if (_this.gltf.nodes) {
                            for (var _i = 0, _a = _this.gltf.nodes; _i < _a.length; _i++) {
                                var node = _a[_i];
                                if (node.name) {
                                    nodeMap_1[node.name] = node.index;
                                }
                            }
                        }
                        var names = (meshesNames instanceof Array) ? meshesNames : [meshesNames];
                        nodes = names.map(function (name) {
                            var node = nodeMap_1[name];
                            if (node === undefined) {
                                throw new Error("Failed to find node '" + name + "'");
                            }
                            return node;
                        });
                    }
                    return _this._loadAsync(nodes, function () {
                        return {
                            meshes: _this._getMeshes(),
                            particleSystems: [],
                            skeletons: _this._getSkeletons(),
                            animationGroups: _this._getAnimationGroups()
                        };
                    });
                });
            };
            /** @hidden */
            GLTFLoader.prototype.loadAsync = function (scene, data, rootUrl, onProgress, fileName) {
                var _this = this;
                return Promise.resolve().then(function () {
                    _this.babylonScene = scene;
                    _this._rootUrl = rootUrl;
                    _this._fileName = fileName || "scene";
                    _this._progressCallback = onProgress;
                    _this._loadData(data);
                    return _this._loadAsync(null, function () { return undefined; });
                });
            };
            GLTFLoader.prototype._loadAsync = function (nodes, resultFunc) {
                var _this = this;
                return Promise.resolve().then(function () {
                    _this._uniqueRootUrl = (_this._rootUrl.indexOf("file:") === -1 && _this._fileName) ? _this._rootUrl : "" + _this._rootUrl + Date.now() + "/";
                    _this._loadExtensions();
                    _this._checkExtensions();
                    var loadingToReadyCounterName = BABYLON.GLTFLoaderState[BABYLON.GLTFLoaderState.LOADING] + " => " + BABYLON.GLTFLoaderState[BABYLON.GLTFLoaderState.READY];
                    var loadingToCompleteCounterName = BABYLON.GLTFLoaderState[BABYLON.GLTFLoaderState.LOADING] + " => " + BABYLON.GLTFLoaderState[BABYLON.GLTFLoaderState.COMPLETE];
                    _this._parent._startPerformanceCounter(loadingToReadyCounterName);
                    _this._parent._startPerformanceCounter(loadingToCompleteCounterName);
                    _this._setState(BABYLON.GLTFLoaderState.LOADING);
                    _this._extensionsOnLoading();
                    var promises = new Array();
                    if (nodes) {
                        promises.push(_this.loadSceneAsync("#/nodes", { nodes: nodes, index: -1 }));
                    }
                    else {
                        var scene = ArrayItem.Get("#/scene", _this.gltf.scenes, _this.gltf.scene || 0);
                        promises.push(_this.loadSceneAsync("#/scenes/" + scene.index, scene));
                    }
                    if (_this._parent.compileMaterials) {
                        promises.push(_this._compileMaterialsAsync());
                    }
                    if (_this._parent.compileShadowGenerators) {
                        promises.push(_this._compileShadowGeneratorsAsync());
                    }
                    var resultPromise = Promise.all(promises).then(function () {
                        _this._setState(BABYLON.GLTFLoaderState.READY);
                        _this._extensionsOnReady();
                        _this._startAnimations();
                        return resultFunc();
                    });
                    resultPromise.then(function () {
                        _this._parent._endPerformanceCounter(loadingToReadyCounterName);
                        BABYLON.Tools.SetImmediate(function () {
                            if (!_this._disposed) {
                                Promise.all(_this._completePromises).then(function () {
                                    _this._parent._endPerformanceCounter(loadingToCompleteCounterName);
                                    _this._setState(BABYLON.GLTFLoaderState.COMPLETE);
                                    _this._parent.onCompleteObservable.notifyObservers(undefined);
                                    _this._parent.onCompleteObservable.clear();
                                    _this.dispose();
                                }, function (error) {
                                    _this._parent.onErrorObservable.notifyObservers(error);
                                    _this._parent.onErrorObservable.clear();
                                    _this.dispose();
                                });
                            }
                        });
                    });
                    return resultPromise;
                }, function (error) {
                    if (!_this._disposed) {
                        _this._parent.onErrorObservable.notifyObservers(error);
                        _this._parent.onErrorObservable.clear();
                        _this.dispose();
                    }
                    throw error;
                });
            };
            GLTFLoader.prototype._loadData = function (data) {
                this.gltf = data.json;
                this._setupData();
                if (data.bin) {
                    var buffers = this.gltf.buffers;
                    if (buffers && buffers[0] && !buffers[0].uri) {
                        var binaryBuffer = buffers[0];
                        if (binaryBuffer.byteLength < data.bin.byteLength - 3 || binaryBuffer.byteLength > data.bin.byteLength) {
                            BABYLON.Tools.Warn("Binary buffer length (" + binaryBuffer.byteLength + ") from JSON does not match chunk length (" + data.bin.byteLength + ")");
                        }
                        binaryBuffer._data = Promise.resolve(data.bin);
                    }
                    else {
                        BABYLON.Tools.Warn("Unexpected BIN chunk");
                    }
                }
            };
            GLTFLoader.prototype._setupData = function () {
                ArrayItem.Assign(this.gltf.accessors);
                ArrayItem.Assign(this.gltf.animations);
                ArrayItem.Assign(this.gltf.buffers);
                ArrayItem.Assign(this.gltf.bufferViews);
                ArrayItem.Assign(this.gltf.cameras);
                ArrayItem.Assign(this.gltf.images);
                ArrayItem.Assign(this.gltf.materials);
                ArrayItem.Assign(this.gltf.meshes);
                ArrayItem.Assign(this.gltf.nodes);
                ArrayItem.Assign(this.gltf.samplers);
                ArrayItem.Assign(this.gltf.scenes);
                ArrayItem.Assign(this.gltf.skins);
                ArrayItem.Assign(this.gltf.textures);
                if (this.gltf.nodes) {
                    var nodeParents = {};
                    for (var _i = 0, _a = this.gltf.nodes; _i < _a.length; _i++) {
                        var node = _a[_i];
                        if (node.children) {
                            for (var _b = 0, _c = node.children; _b < _c.length; _b++) {
                                var index = _c[_b];
                                nodeParents[index] = node.index;
                            }
                        }
                    }
                    var rootNode = this._createRootNode();
                    for (var _d = 0, _e = this.gltf.nodes; _d < _e.length; _d++) {
                        var node = _e[_d];
                        var parentIndex = nodeParents[node.index];
                        node.parent = parentIndex === undefined ? rootNode : this.gltf.nodes[parentIndex];
                    }
                }
            };
            GLTFLoader.prototype._loadExtensions = function () {
                for (var _i = 0, _a = GLTFLoader._ExtensionNames; _i < _a.length; _i++) {
                    var name_2 = _a[_i];
                    var extension = GLTFLoader._ExtensionFactories[name_2](this);
                    this._extensions[name_2] = extension;
                    this._parent.onExtensionLoadedObservable.notifyObservers(extension);
                }
                this._parent.onExtensionLoadedObservable.clear();
            };
            GLTFLoader.prototype._checkExtensions = function () {
                if (this.gltf.extensionsRequired) {
                    for (var _i = 0, _a = this.gltf.extensionsRequired; _i < _a.length; _i++) {
                        var name_3 = _a[_i];
                        var extension = this._extensions[name_3];
                        if (!extension || !extension.enabled) {
                            throw new Error("Require extension " + name_3 + " is not available");
                        }
                    }
                }
            };
            GLTFLoader.prototype._setState = function (state) {
                this._state = state;
                this.log(BABYLON.GLTFLoaderState[this._state]);
            };
            GLTFLoader.prototype._createRootNode = function () {
                this._rootBabylonMesh = new BABYLON.Mesh("__root__", this.babylonScene);
                var rootNode = {
                    _babylonMesh: this._rootBabylonMesh,
                    index: -1
                };
                switch (this._parent.coordinateSystemMode) {
                    case BABYLON.GLTFLoaderCoordinateSystemMode.AUTO: {
                        if (!this.babylonScene.useRightHandedSystem) {
                            rootNode.rotation = [0, 1, 0, 0];
                            rootNode.scale = [1, 1, -1];
                            GLTFLoader._LoadTransform(rootNode, this._rootBabylonMesh);
                        }
                        break;
                    }
                    case BABYLON.GLTFLoaderCoordinateSystemMode.FORCE_RIGHT_HANDED: {
                        this.babylonScene.useRightHandedSystem = true;
                        break;
                    }
                    default: {
                        throw new Error("Invalid coordinate system mode (" + this._parent.coordinateSystemMode + ")");
                    }
                }
                this._parent.onMeshLoadedObservable.notifyObservers(this._rootBabylonMesh);
                return rootNode;
            };
            /**
             * Loads a glTF scene.
             * @param context The context when loading the asset
             * @param scene The glTF scene property
             * @returns A promise that resolves when the load is complete
             */
            GLTFLoader.prototype.loadSceneAsync = function (context, scene) {
                var _this = this;
                var extensionPromise = this._extensionsLoadSceneAsync(context, scene);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var promises = new Array();
                this.logOpen(context + " " + (scene.name || ""));
                if (scene.nodes) {
                    for (var _i = 0, _a = scene.nodes; _i < _a.length; _i++) {
                        var index = _a[_i];
                        var node = ArrayItem.Get(context + "/nodes/" + index, this.gltf.nodes, index);
                        promises.push(this.loadNodeAsync("#/nodes/" + node.index, node, function (babylonMesh) {
                            babylonMesh.parent = _this._rootBabylonMesh;
                        }));
                    }
                }
                promises.push(this._loadAnimationsAsync());
                this.logClose();
                return Promise.all(promises).then(function () { });
            };
            GLTFLoader.prototype._forEachPrimitive = function (node, callback) {
                if (node._primitiveBabylonMeshes) {
                    for (var _i = 0, _a = node._primitiveBabylonMeshes; _i < _a.length; _i++) {
                        var babylonMesh = _a[_i];
                        callback(babylonMesh);
                    }
                }
                else {
                    callback(node._babylonMesh);
                }
            };
            GLTFLoader.prototype._getMeshes = function () {
                var meshes = new Array();
                // Root mesh is always first.
                meshes.push(this._rootBabylonMesh);
                var nodes = this.gltf.nodes;
                if (nodes) {
                    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                        var node = nodes_1[_i];
                        if (node._babylonMesh) {
                            meshes.push(node._babylonMesh);
                        }
                        if (node._primitiveBabylonMeshes) {
                            for (var _a = 0, _b = node._primitiveBabylonMeshes; _a < _b.length; _a++) {
                                var babylonMesh = _b[_a];
                                meshes.push(babylonMesh);
                            }
                        }
                    }
                }
                return meshes;
            };
            GLTFLoader.prototype._getSkeletons = function () {
                var skeletons = new Array();
                var skins = this.gltf.skins;
                if (skins) {
                    for (var _i = 0, skins_1 = skins; _i < skins_1.length; _i++) {
                        var skin = skins_1[_i];
                        if (skin._babylonSkeleton) {
                            skeletons.push(skin._babylonSkeleton);
                        }
                    }
                }
                return skeletons;
            };
            GLTFLoader.prototype._getAnimationGroups = function () {
                var animationGroups = new Array();
                var animations = this.gltf.animations;
                if (animations) {
                    for (var _i = 0, animations_1 = animations; _i < animations_1.length; _i++) {
                        var animation = animations_1[_i];
                        if (animation._babylonAnimationGroup) {
                            animationGroups.push(animation._babylonAnimationGroup);
                        }
                    }
                }
                return animationGroups;
            };
            GLTFLoader.prototype._startAnimations = function () {
                switch (this._parent.animationStartMode) {
                    case BABYLON.GLTFLoaderAnimationStartMode.NONE: {
                        // do nothing
                        break;
                    }
                    case BABYLON.GLTFLoaderAnimationStartMode.FIRST: {
                        var babylonAnimationGroups = this._getAnimationGroups();
                        if (babylonAnimationGroups.length !== 0) {
                            babylonAnimationGroups[0].start(true);
                        }
                        break;
                    }
                    case BABYLON.GLTFLoaderAnimationStartMode.ALL: {
                        var babylonAnimationGroups = this._getAnimationGroups();
                        for (var _i = 0, babylonAnimationGroups_1 = babylonAnimationGroups; _i < babylonAnimationGroups_1.length; _i++) {
                            var babylonAnimationGroup = babylonAnimationGroups_1[_i];
                            babylonAnimationGroup.start(true);
                        }
                        break;
                    }
                    default: {
                        BABYLON.Tools.Error("Invalid animation start mode (" + this._parent.animationStartMode + ")");
                        return;
                    }
                }
            };
            /**
             * Loads a glTF node.
             * @param context The context when loading the asset
             * @param node The glTF node property
             * @param assign A function called synchronously after parsing the glTF properties
             * @returns A promise that resolves with the loaded Babylon mesh when the load is complete
             */
            GLTFLoader.prototype.loadNodeAsync = function (context, node, assign) {
                var _this = this;
                if (assign === void 0) { assign = function () { }; }
                var extensionPromise = this._extensionsLoadNodeAsync(context, node, assign);
                if (extensionPromise) {
                    return extensionPromise;
                }
                if (node._babylonMesh) {
                    throw new Error(context + ": Invalid recursive node hierarchy");
                }
                var promises = new Array();
                this.logOpen(context + " " + (node.name || ""));
                var babylonMesh = new BABYLON.Mesh(node.name || "node" + node.index, this.babylonScene);
                node._babylonMesh = babylonMesh;
                babylonMesh.setEnabled(false);
                GLTFLoader._LoadTransform(node, babylonMesh);
                if (node.mesh != undefined) {
                    var mesh = ArrayItem.Get(context + "/mesh", this.gltf.meshes, node.mesh);
                    promises.push(this._loadMeshAsync("#/meshes/" + mesh.index, node, mesh, babylonMesh));
                }
                if (node.camera != undefined) {
                    var camera = ArrayItem.Get(context + "/camera", this.gltf.cameras, node.camera);
                    promises.push(this.loadCameraAsync("#/cameras/" + camera.index, camera, function (babylonCamera) {
                        babylonCamera.parent = babylonMesh;
                    }));
                }
                if (node.children) {
                    var _loop_1 = function (index) {
                        var childNode = ArrayItem.Get(context + "/children/" + index, this_1.gltf.nodes, index);
                        promises.push(this_1.loadNodeAsync("#/nodes/" + node.index, childNode, function (childBabylonMesh) {
                            // See https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins (second implementation note)
                            if (childNode.skin != undefined) {
                                childBabylonMesh.parent = _this._rootBabylonMesh;
                                return;
                            }
                            childBabylonMesh.parent = babylonMesh;
                        }));
                    };
                    var this_1 = this;
                    for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
                        var index = _a[_i];
                        _loop_1(index);
                    }
                }
                assign(babylonMesh);
                this._parent.onMeshLoadedObservable.notifyObservers(babylonMesh);
                this.logClose();
                return Promise.all(promises).then(function () {
                    babylonMesh.setEnabled(true);
                    return babylonMesh;
                });
            };
            GLTFLoader.prototype._loadMeshAsync = function (context, node, mesh, babylonMesh) {
                var _this = this;
                var promises = new Array();
                this.logOpen(context + " " + (mesh.name || ""));
                var primitives = mesh.primitives;
                if (!primitives || primitives.length === 0) {
                    throw new Error(context + ": Primitives are missing");
                }
                ArrayItem.Assign(primitives);
                if (primitives.length === 1) {
                    var primitive = primitives[0];
                    promises.push(this._loadMeshPrimitiveAsync(context + "/primitives/" + primitive.index, node, mesh, primitive, babylonMesh));
                }
                else {
                    node._primitiveBabylonMeshes = [];
                    for (var _i = 0, primitives_1 = primitives; _i < primitives_1.length; _i++) {
                        var primitive = primitives_1[_i];
                        var primitiveBabylonMesh = new BABYLON.Mesh((mesh.name || babylonMesh.name) + "_" + primitive.index, this.babylonScene, babylonMesh);
                        node._primitiveBabylonMeshes.push(primitiveBabylonMesh);
                        promises.push(this._loadMeshPrimitiveAsync(context + "/primitives/" + primitive.index, node, mesh, primitive, primitiveBabylonMesh));
                        this._parent.onMeshLoadedObservable.notifyObservers(babylonMesh);
                    }
                }
                if (node.skin != undefined) {
                    var skin = ArrayItem.Get(context + "/skin", this.gltf.skins, node.skin);
                    promises.push(this._loadSkinAsync("#/skins/" + skin.index, node, skin));
                }
                this.logClose();
                return Promise.all(promises).then(function () {
                    _this._forEachPrimitive(node, function (babylonMesh) {
                        babylonMesh._refreshBoundingInfo(true);
                    });
                });
            };
            GLTFLoader.prototype._loadMeshPrimitiveAsync = function (context, node, mesh, primitive, babylonMesh) {
                var _this = this;
                var promises = new Array();
                this.logOpen("" + context);
                this._createMorphTargets(context, node, mesh, primitive, babylonMesh);
                promises.push(this._loadVertexDataAsync(context, primitive, babylonMesh).then(function (babylonGeometry) {
                    return _this._loadMorphTargetsAsync(context, primitive, babylonMesh, babylonGeometry).then(function () {
                        babylonGeometry.applyToMesh(babylonMesh);
                    });
                }));
                var babylonDrawMode = GLTFLoader._GetDrawMode(context, primitive.mode);
                if (primitive.material == undefined) {
                    var babylonMaterial = this._defaultBabylonMaterialData[babylonDrawMode];
                    if (!babylonMaterial) {
                        babylonMaterial = this._createDefaultMaterial("__gltf_default", babylonDrawMode);
                        this._parent.onMaterialLoadedObservable.notifyObservers(babylonMaterial);
                        this._defaultBabylonMaterialData[babylonDrawMode] = babylonMaterial;
                    }
                    babylonMesh.material = babylonMaterial;
                }
                else {
                    var material = ArrayItem.Get(context + "/material", this.gltf.materials, primitive.material);
                    promises.push(this._loadMaterialAsync("#/materials/" + material.index, material, babylonMesh, babylonDrawMode, function (babylonMaterial) {
                        babylonMesh.material = babylonMaterial;
                    }));
                }
                this.logClose();
                return Promise.all(promises).then(function () { });
            };
            GLTFLoader.prototype._loadVertexDataAsync = function (context, primitive, babylonMesh) {
                var _this = this;
                var extensionPromise = this._extensionsLoadVertexDataAsync(context, primitive, babylonMesh);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var attributes = primitive.attributes;
                if (!attributes) {
                    throw new Error(context + ": Attributes are missing");
                }
                var promises = new Array();
                var babylonGeometry = new BABYLON.Geometry(babylonMesh.name, this.babylonScene);
                if (primitive.indices == undefined) {
                    babylonMesh.isUnIndexed = true;
                }
                else {
                    var accessor = ArrayItem.Get(context + "/indices", this.gltf.accessors, primitive.indices);
                    promises.push(this._loadIndicesAccessorAsync("#/accessors/" + accessor.index, accessor).then(function (data) {
                        babylonGeometry.setIndices(data);
                    }));
                }
                var loadAttribute = function (attribute, kind, callback) {
                    if (attributes[attribute] == undefined) {
                        return;
                    }
                    babylonMesh._delayInfo = babylonMesh._delayInfo || [];
                    if (babylonMesh._delayInfo.indexOf(kind) === -1) {
                        babylonMesh._delayInfo.push(kind);
                    }
                    var accessor = ArrayItem.Get(context + "/attributes/" + attribute, _this.gltf.accessors, attributes[attribute]);
                    promises.push(_this._loadVertexAccessorAsync("#/accessors/" + accessor.index, accessor, kind).then(function (babylonVertexBuffer) {
                        babylonGeometry.setVerticesBuffer(babylonVertexBuffer, accessor.count);
                    }));
                    if (callback) {
                        callback(accessor);
                    }
                };
                loadAttribute("POSITION", BABYLON.VertexBuffer.PositionKind);
                loadAttribute("NORMAL", BABYLON.VertexBuffer.NormalKind);
                loadAttribute("TANGENT", BABYLON.VertexBuffer.TangentKind);
                loadAttribute("TEXCOORD_0", BABYLON.VertexBuffer.UVKind);
                loadAttribute("TEXCOORD_1", BABYLON.VertexBuffer.UV2Kind);
                loadAttribute("JOINTS_0", BABYLON.VertexBuffer.MatricesIndicesKind);
                loadAttribute("WEIGHTS_0", BABYLON.VertexBuffer.MatricesWeightsKind);
                loadAttribute("COLOR_0", BABYLON.VertexBuffer.ColorKind, function (accessor) {
                    if (accessor.type === "VEC4" /* VEC4 */) {
                        babylonMesh.hasVertexAlpha = true;
                    }
                });
                return Promise.all(promises).then(function () {
                    return babylonGeometry;
                });
            };
            GLTFLoader.prototype._createMorphTargets = function (context, node, mesh, primitive, babylonMesh) {
                if (!primitive.targets) {
                    return;
                }
                if (node._numMorphTargets == undefined) {
                    node._numMorphTargets = primitive.targets.length;
                }
                else if (primitive.targets.length !== node._numMorphTargets) {
                    throw new Error(context + ": Primitives do not have the same number of targets");
                }
                babylonMesh.morphTargetManager = new BABYLON.MorphTargetManager();
                for (var index = 0; index < primitive.targets.length; index++) {
                    var weight = node.weights ? node.weights[index] : mesh.weights ? mesh.weights[index] : 0;
                    babylonMesh.morphTargetManager.addTarget(new BABYLON.MorphTarget("morphTarget" + index, weight));
                    // TODO: tell the target whether it has positions, normals, tangents
                }
            };
            GLTFLoader.prototype._loadMorphTargetsAsync = function (context, primitive, babylonMesh, babylonGeometry) {
                if (!primitive.targets) {
                    return Promise.resolve();
                }
                var promises = new Array();
                var morphTargetManager = babylonMesh.morphTargetManager;
                for (var index = 0; index < morphTargetManager.numTargets; index++) {
                    var babylonMorphTarget = morphTargetManager.getTarget(index);
                    promises.push(this._loadMorphTargetVertexDataAsync(context + "/targets/" + index, babylonGeometry, primitive.targets[index], babylonMorphTarget));
                }
                return Promise.all(promises).then(function () { });
            };
            GLTFLoader.prototype._loadMorphTargetVertexDataAsync = function (context, babylonGeometry, attributes, babylonMorphTarget) {
                var _this = this;
                var promises = new Array();
                var loadAttribute = function (attribute, kind, setData) {
                    if (attributes[attribute] == undefined) {
                        return;
                    }
                    var babylonVertexBuffer = babylonGeometry.getVertexBuffer(kind);
                    if (!babylonVertexBuffer) {
                        return;
                    }
                    var accessor = ArrayItem.Get(context + "/" + attribute, _this.gltf.accessors, attributes[attribute]);
                    promises.push(_this._loadFloatAccessorAsync("#/accessors/" + accessor.index, accessor).then(function (data) {
                        setData(babylonVertexBuffer, data);
                    }));
                };
                loadAttribute("POSITION", BABYLON.VertexBuffer.PositionKind, function (babylonVertexBuffer, data) {
                    babylonVertexBuffer.forEach(data.length, function (value, index) {
                        data[index] += value;
                    });
                    babylonMorphTarget.setPositions(data);
                });
                loadAttribute("NORMAL", BABYLON.VertexBuffer.NormalKind, function (babylonVertexBuffer, data) {
                    babylonVertexBuffer.forEach(data.length, function (value, index) {
                        data[index] += value;
                    });
                    babylonMorphTarget.setNormals(data);
                });
                loadAttribute("TANGENT", BABYLON.VertexBuffer.TangentKind, function (babylonVertexBuffer, data) {
                    var dataIndex = 0;
                    babylonVertexBuffer.forEach(data.length / 3 * 4, function (value, index) {
                        // Tangent data for morph targets is stored as xyz delta.
                        // The vertexData.tangent is stored as xyzw.
                        // So we need to skip every fourth vertexData.tangent.
                        if (((index + 1) % 4) !== 0) {
                            data[dataIndex++] += value;
                        }
                    });
                    babylonMorphTarget.setTangents(data);
                });
                return Promise.all(promises).then(function () { });
            };
            GLTFLoader._LoadTransform = function (node, babylonNode) {
                var position = BABYLON.Vector3.Zero();
                var rotation = BABYLON.Quaternion.Identity();
                var scaling = BABYLON.Vector3.One();
                if (node.matrix) {
                    var matrix = BABYLON.Matrix.FromArray(node.matrix);
                    matrix.decompose(scaling, rotation, position);
                }
                else {
                    if (node.translation) {
                        position = BABYLON.Vector3.FromArray(node.translation);
                    }
                    if (node.rotation) {
                        rotation = BABYLON.Quaternion.FromArray(node.rotation);
                    }
                    if (node.scale) {
                        scaling = BABYLON.Vector3.FromArray(node.scale);
                    }
                }
                babylonNode.position = position;
                babylonNode.rotationQuaternion = rotation;
                babylonNode.scaling = scaling;
            };
            GLTFLoader.prototype._loadSkinAsync = function (context, node, skin) {
                var _this = this;
                var assignSkeleton = function (skeleton) {
                    _this._forEachPrimitive(node, function (babylonMesh) {
                        babylonMesh.skeleton = skeleton;
                    });
                    // Ignore the TRS of skinned nodes.
                    // See https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins (second implementation note)
                    node._babylonMesh.position = BABYLON.Vector3.Zero();
                    node._babylonMesh.rotationQuaternion = BABYLON.Quaternion.Identity();
                    node._babylonMesh.scaling = BABYLON.Vector3.One();
                };
                if (skin._promise) {
                    return skin._promise.then(function () {
                        assignSkeleton(skin._babylonSkeleton);
                    });
                }
                var skeletonId = "skeleton" + skin.index;
                var babylonSkeleton = new BABYLON.Skeleton(skin.name || skeletonId, skeletonId, this.babylonScene);
                skin._babylonSkeleton = babylonSkeleton;
                this._loadBones(context, skin);
                assignSkeleton(babylonSkeleton);
                return (skin._promise = this._loadSkinInverseBindMatricesDataAsync(context, skin).then(function (inverseBindMatricesData) {
                    _this._updateBoneMatrices(babylonSkeleton, inverseBindMatricesData);
                }));
            };
            GLTFLoader.prototype._loadBones = function (context, skin) {
                var babylonBones = {};
                for (var _i = 0, _a = skin.joints; _i < _a.length; _i++) {
                    var index = _a[_i];
                    var node = ArrayItem.Get(context + "/joints/" + index, this.gltf.nodes, index);
                    this._loadBone(node, skin, babylonBones);
                }
            };
            GLTFLoader.prototype._loadBone = function (node, skin, babylonBones) {
                var babylonBone = babylonBones[node.index];
                if (babylonBone) {
                    return babylonBone;
                }
                var babylonParentBone = null;
                if (node.parent && node.parent._babylonMesh !== this._rootBabylonMesh) {
                    babylonParentBone = this._loadBone(node.parent, skin, babylonBones);
                }
                var boneIndex = skin.joints.indexOf(node.index);
                babylonBone = new BABYLON.Bone(node.name || "joint" + node.index, skin._babylonSkeleton, babylonParentBone, this._getNodeMatrix(node), null, null, boneIndex);
                babylonBones[node.index] = babylonBone;
                node._babylonBones = node._babylonBones || [];
                node._babylonBones.push(babylonBone);
                return babylonBone;
            };
            GLTFLoader.prototype._loadSkinInverseBindMatricesDataAsync = function (context, skin) {
                if (skin.inverseBindMatrices == undefined) {
                    return Promise.resolve(null);
                }
                var accessor = ArrayItem.Get(context + "/inverseBindMatrices", this.gltf.accessors, skin.inverseBindMatrices);
                return this._loadFloatAccessorAsync("#/accessors/" + accessor.index, accessor);
            };
            GLTFLoader.prototype._updateBoneMatrices = function (babylonSkeleton, inverseBindMatricesData) {
                for (var _i = 0, _a = babylonSkeleton.bones; _i < _a.length; _i++) {
                    var babylonBone = _a[_i];
                    var baseMatrix = BABYLON.Matrix.Identity();
                    var boneIndex = babylonBone._index;
                    if (inverseBindMatricesData && boneIndex !== -1) {
                        BABYLON.Matrix.FromArrayToRef(inverseBindMatricesData, boneIndex * 16, baseMatrix);
                        baseMatrix.invertToRef(baseMatrix);
                    }
                    var babylonParentBone = babylonBone.getParent();
                    if (babylonParentBone) {
                        baseMatrix.multiplyToRef(babylonParentBone.getInvertedAbsoluteTransform(), baseMatrix);
                    }
                    babylonBone.updateMatrix(baseMatrix, false, false);
                    babylonBone._updateDifferenceMatrix(undefined, false);
                }
            };
            GLTFLoader.prototype._getNodeMatrix = function (node) {
                return node.matrix ?
                    BABYLON.Matrix.FromArray(node.matrix) :
                    BABYLON.Matrix.Compose(node.scale ? BABYLON.Vector3.FromArray(node.scale) : BABYLON.Vector3.One(), node.rotation ? BABYLON.Quaternion.FromArray(node.rotation) : BABYLON.Quaternion.Identity(), node.translation ? BABYLON.Vector3.FromArray(node.translation) : BABYLON.Vector3.Zero());
            };
            /**
             * Loads a glTF camera.
             * @param context The context when loading the asset
             * @param camera The glTF camera property
             * @param assign A function called synchronously after parsing the glTF properties
             * @returns A promise that resolves with the loaded Babylon camera when the load is complete
             */
            GLTFLoader.prototype.loadCameraAsync = function (context, camera, assign) {
                if (assign === void 0) { assign = function () { }; }
                var extensionPromise = this._extensionsLoadCameraAsync(context, camera, assign);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var promises = new Array();
                this.logOpen(context + " " + (camera.name || ""));
                var babylonCamera = new BABYLON.FreeCamera(camera.name || "camera" + camera.index, BABYLON.Vector3.Zero(), this.babylonScene, false);
                babylonCamera.rotation = new BABYLON.Vector3(0, Math.PI, 0);
                switch (camera.type) {
                    case "perspective" /* PERSPECTIVE */: {
                        var perspective = camera.perspective;
                        if (!perspective) {
                            throw new Error(context + ": Camera perspective properties are missing");
                        }
                        babylonCamera.fov = perspective.yfov;
                        babylonCamera.minZ = perspective.znear;
                        babylonCamera.maxZ = perspective.zfar || Number.MAX_VALUE;
                        break;
                    }
                    case "orthographic" /* ORTHOGRAPHIC */: {
                        if (!camera.orthographic) {
                            throw new Error(context + ": Camera orthographic properties are missing");
                        }
                        babylonCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
                        babylonCamera.orthoLeft = -camera.orthographic.xmag;
                        babylonCamera.orthoRight = camera.orthographic.xmag;
                        babylonCamera.orthoBottom = -camera.orthographic.ymag;
                        babylonCamera.orthoTop = camera.orthographic.ymag;
                        babylonCamera.minZ = camera.orthographic.znear;
                        babylonCamera.maxZ = camera.orthographic.zfar;
                        break;
                    }
                    default: {
                        throw new Error(context + ": Invalid camera type (" + camera.type + ")");
                    }
                }
                assign(babylonCamera);
                this._parent.onCameraLoadedObservable.notifyObservers(babylonCamera);
                return Promise.all(promises).then(function () {
                    return babylonCamera;
                });
            };
            GLTFLoader.prototype._loadAnimationsAsync = function () {
                var animations = this.gltf.animations;
                if (!animations) {
                    return Promise.resolve();
                }
                var promises = new Array();
                for (var index = 0; index < animations.length; index++) {
                    var animation = animations[index];
                    promises.push(this.loadAnimationAsync("#/animations/" + animation.index, animation));
                }
                return Promise.all(promises).then(function () { });
            };
            /**
             * Loads a glTF animation.
             * @param context The context when loading the asset
             * @param animation The glTF animation property
             * @returns A promise that resolves with the loaded Babylon animation group when the load is complete
             */
            GLTFLoader.prototype.loadAnimationAsync = function (context, animation) {
                var promise = this._extensionsLoadAnimationAsync(context, animation);
                if (promise) {
                    return promise;
                }
                var babylonAnimationGroup = new BABYLON.AnimationGroup(animation.name || "animation" + animation.index, this.babylonScene);
                animation._babylonAnimationGroup = babylonAnimationGroup;
                var promises = new Array();
                ArrayItem.Assign(animation.channels);
                ArrayItem.Assign(animation.samplers);
                for (var _i = 0, _a = animation.channels; _i < _a.length; _i++) {
                    var channel = _a[_i];
                    promises.push(this._loadAnimationChannelAsync(context + "/channels/" + channel.index, context, animation, channel, babylonAnimationGroup));
                }
                return Promise.all(promises).then(function () {
                    babylonAnimationGroup.normalize(0);
                    return babylonAnimationGroup;
                });
            };
            GLTFLoader.prototype._loadAnimationChannelAsync = function (context, animationContext, animation, channel, babylonAnimationGroup) {
                var _this = this;
                var targetNode = ArrayItem.Get(context + "/target/node", this.gltf.nodes, channel.target.node);
                // Ignore animations that have no animation targets.
                if ((channel.target.path === "weights" /* WEIGHTS */ && !targetNode._numMorphTargets) ||
                    (channel.target.path !== "weights" /* WEIGHTS */ && !targetNode._babylonMesh)) {
                    return Promise.resolve();
                }
                // Ignore animations targeting TRS of skinned nodes.
                // See https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins (second implementation note)
                if (targetNode.skin != undefined && channel.target.path !== "weights" /* WEIGHTS */) {
                    return Promise.resolve();
                }
                var sampler = ArrayItem.Get(context + "/sampler", animation.samplers, channel.sampler);
                return this._loadAnimationSamplerAsync(animationContext + "/samplers/" + channel.sampler, sampler).then(function (data) {
                    var targetPath;
                    var animationType;
                    switch (channel.target.path) {
                        case "translation" /* TRANSLATION */: {
                            targetPath = "position";
                            animationType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                            break;
                        }
                        case "rotation" /* ROTATION */: {
                            targetPath = "rotationQuaternion";
                            animationType = BABYLON.Animation.ANIMATIONTYPE_QUATERNION;
                            break;
                        }
                        case "scale" /* SCALE */: {
                            targetPath = "scaling";
                            animationType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                            break;
                        }
                        case "weights" /* WEIGHTS */: {
                            targetPath = "influence";
                            animationType = BABYLON.Animation.ANIMATIONTYPE_FLOAT;
                            break;
                        }
                        default: {
                            throw new Error(context + "/target/path: Invalid value (" + channel.target.path + ")");
                        }
                    }
                    var outputBufferOffset = 0;
                    var getNextOutputValue;
                    switch (targetPath) {
                        case "position": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Vector3.FromArray(data.output, outputBufferOffset);
                                outputBufferOffset += 3;
                                return value;
                            };
                            break;
                        }
                        case "rotationQuaternion": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Quaternion.FromArray(data.output, outputBufferOffset);
                                outputBufferOffset += 4;
                                return value;
                            };
                            break;
                        }
                        case "scaling": {
                            getNextOutputValue = function () {
                                var value = BABYLON.Vector3.FromArray(data.output, outputBufferOffset);
                                outputBufferOffset += 3;
                                return value;
                            };
                            break;
                        }
                        case "influence": {
                            getNextOutputValue = function () {
                                var value = new Array(targetNode._numMorphTargets);
                                for (var i = 0; i < targetNode._numMorphTargets; i++) {
                                    value[i] = data.output[outputBufferOffset++];
                                }
                                return value;
                            };
                            break;
                        }
                    }
                    var getNextKey;
                    switch (data.interpolation) {
                        case "STEP" /* STEP */: {
                            getNextKey = function (frameIndex) { return ({
                                frame: data.input[frameIndex],
                                value: getNextOutputValue(),
                                interpolation: BABYLON.AnimationKeyInterpolation.STEP
                            }); };
                            break;
                        }
                        case "LINEAR" /* LINEAR */: {
                            getNextKey = function (frameIndex) { return ({
                                frame: data.input[frameIndex],
                                value: getNextOutputValue()
                            }); };
                            break;
                        }
                        case "CUBICSPLINE" /* CUBICSPLINE */: {
                            getNextKey = function (frameIndex) { return ({
                                frame: data.input[frameIndex],
                                inTangent: getNextOutputValue(),
                                value: getNextOutputValue(),
                                outTangent: getNextOutputValue()
                            }); };
                            break;
                        }
                    }
                    var keys = new Array(data.input.length);
                    for (var frameIndex = 0; frameIndex < data.input.length; frameIndex++) {
                        keys[frameIndex] = getNextKey(frameIndex);
                    }
                    if (targetPath === "influence") {
                        var _loop_2 = function (targetIndex) {
                            var animationName = babylonAnimationGroup.name + "_channel" + babylonAnimationGroup.targetedAnimations.length;
                            var babylonAnimation = new BABYLON.Animation(animationName, targetPath, 1, animationType);
                            babylonAnimation.setKeys(keys.map(function (key) { return ({
                                frame: key.frame,
                                inTangent: key.inTangent ? key.inTangent[targetIndex] : undefined,
                                value: key.value[targetIndex],
                                outTangent: key.outTangent ? key.outTangent[targetIndex] : undefined
                            }); }));
                            _this._forEachPrimitive(targetNode, function (babylonMesh) {
                                var morphTarget = babylonMesh.morphTargetManager.getTarget(targetIndex);
                                var babylonAnimationClone = babylonAnimation.clone();
                                morphTarget.animations.push(babylonAnimationClone);
                                babylonAnimationGroup.addTargetedAnimation(babylonAnimationClone, morphTarget);
                            });
                        };
                        for (var targetIndex = 0; targetIndex < targetNode._numMorphTargets; targetIndex++) {
                            _loop_2(targetIndex);
                        }
                    }
                    else {
                        var animationName = babylonAnimationGroup.name + "_channel" + babylonAnimationGroup.targetedAnimations.length;
                        var babylonAnimation = new BABYLON.Animation(animationName, targetPath, 1, animationType);
                        babylonAnimation.setKeys(keys);
                        if (targetNode._babylonBones) {
                            var babylonAnimationTargets = [targetNode._babylonMesh].concat(targetNode._babylonBones);
                            for (var _i = 0, babylonAnimationTargets_1 = babylonAnimationTargets; _i < babylonAnimationTargets_1.length; _i++) {
                                var babylonAnimationTarget = babylonAnimationTargets_1[_i];
                                babylonAnimationTarget.animations.push(babylonAnimation);
                            }
                            babylonAnimationGroup.addTargetedAnimation(babylonAnimation, babylonAnimationTargets);
                        }
                        else {
                            targetNode._babylonMesh.animations.push(babylonAnimation);
                            babylonAnimationGroup.addTargetedAnimation(babylonAnimation, targetNode._babylonMesh);
                        }
                    }
                });
            };
            GLTFLoader.prototype._loadAnimationSamplerAsync = function (context, sampler) {
                if (sampler._data) {
                    return sampler._data;
                }
                var interpolation = sampler.interpolation || "LINEAR" /* LINEAR */;
                switch (interpolation) {
                    case "STEP" /* STEP */:
                    case "LINEAR" /* LINEAR */:
                    case "CUBICSPLINE" /* CUBICSPLINE */: {
                        break;
                    }
                    default: {
                        throw new Error(context + "/interpolation: Invalid value (" + sampler.interpolation + ")");
                    }
                }
                var inputAccessor = ArrayItem.Get(context + "/input", this.gltf.accessors, sampler.input);
                var outputAccessor = ArrayItem.Get(context + "/output", this.gltf.accessors, sampler.output);
                sampler._data = Promise.all([
                    this._loadFloatAccessorAsync("#/accessors/" + inputAccessor.index, inputAccessor),
                    this._loadFloatAccessorAsync("#/accessors/" + outputAccessor.index, outputAccessor)
                ]).then(function (_a) {
                    var inputData = _a[0], outputData = _a[1];
                    return {
                        input: inputData,
                        interpolation: interpolation,
                        output: outputData,
                    };
                });
                return sampler._data;
            };
            GLTFLoader.prototype._loadBufferAsync = function (context, buffer) {
                if (buffer._data) {
                    return buffer._data;
                }
                if (!buffer.uri) {
                    throw new Error(context + "/uri: Value is missing");
                }
                buffer._data = this.loadUriAsync(context + "/uri", buffer.uri);
                return buffer._data;
            };
            /**
             * Loads a glTF buffer view.
             * @param context The context when loading the asset
             * @param bufferView The glTF buffer view property
             * @returns A promise that resolves with the loaded data when the load is complete
             */
            GLTFLoader.prototype.loadBufferViewAsync = function (context, bufferView) {
                if (bufferView._data) {
                    return bufferView._data;
                }
                var buffer = ArrayItem.Get(context + "/buffer", this.gltf.buffers, bufferView.buffer);
                bufferView._data = this._loadBufferAsync("#/buffers/" + buffer.index, buffer).then(function (data) {
                    try {
                        return new Uint8Array(data.buffer, data.byteOffset + (bufferView.byteOffset || 0), bufferView.byteLength);
                    }
                    catch (e) {
                        throw new Error(context + ": " + e.message);
                    }
                });
                return bufferView._data;
            };
            GLTFLoader.prototype._loadIndicesAccessorAsync = function (context, accessor) {
                if (accessor.type !== "SCALAR" /* SCALAR */) {
                    throw new Error(context + "/type: Invalid value " + accessor.type);
                }
                if (accessor.componentType !== 5121 /* UNSIGNED_BYTE */ &&
                    accessor.componentType !== 5123 /* UNSIGNED_SHORT */ &&
                    accessor.componentType !== 5125 /* UNSIGNED_INT */) {
                    throw new Error(context + "/componentType: Invalid value " + accessor.componentType);
                }
                if (accessor._data) {
                    return accessor._data;
                }
                var bufferView = ArrayItem.Get(context + "/bufferView", this.gltf.bufferViews, accessor.bufferView);
                accessor._data = this.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView).then(function (data) {
                    return GLTFLoader._GetTypedArray(context, accessor.componentType, data, accessor.byteOffset, accessor.count);
                });
                return accessor._data;
            };
            GLTFLoader.prototype._loadFloatAccessorAsync = function (context, accessor) {
                // TODO: support normalized and stride
                var _this = this;
                if (accessor.componentType !== 5126 /* FLOAT */) {
                    throw new Error("Invalid component type " + accessor.componentType);
                }
                if (accessor._data) {
                    return accessor._data;
                }
                var numComponents = GLTFLoader._GetNumComponents(context, accessor.type);
                var length = numComponents * accessor.count;
                if (accessor.bufferView == undefined) {
                    accessor._data = Promise.resolve(new Float32Array(length));
                }
                else {
                    var bufferView = ArrayItem.Get(context + "/bufferView", this.gltf.bufferViews, accessor.bufferView);
                    accessor._data = this.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView).then(function (data) {
                        return GLTFLoader._GetTypedArray(context, accessor.componentType, data, accessor.byteOffset, length);
                    });
                }
                if (accessor.sparse) {
                    var sparse_1 = accessor.sparse;
                    accessor._data = accessor._data.then(function (data) {
                        var indicesBufferView = ArrayItem.Get(context + "/sparse/indices/bufferView", _this.gltf.bufferViews, sparse_1.indices.bufferView);
                        var valuesBufferView = ArrayItem.Get(context + "/sparse/values/bufferView", _this.gltf.bufferViews, sparse_1.values.bufferView);
                        return Promise.all([
                            _this.loadBufferViewAsync("#/bufferViews/" + indicesBufferView.index, indicesBufferView),
                            _this.loadBufferViewAsync("#/bufferViews/" + valuesBufferView.index, valuesBufferView)
                        ]).then(function (_a) {
                            var indicesData = _a[0], valuesData = _a[1];
                            var indices = GLTFLoader._GetTypedArray(context + "/sparse/indices", sparse_1.indices.componentType, indicesData, sparse_1.indices.byteOffset, sparse_1.count);
                            var values = GLTFLoader._GetTypedArray(context + "/sparse/values", accessor.componentType, valuesData, sparse_1.values.byteOffset, numComponents * sparse_1.count);
                            var valuesIndex = 0;
                            for (var indicesIndex = 0; indicesIndex < indices.length; indicesIndex++) {
                                var dataIndex = indices[indicesIndex] * numComponents;
                                for (var componentIndex = 0; componentIndex < numComponents; componentIndex++) {
                                    data[dataIndex++] = values[valuesIndex++];
                                }
                            }
                            return data;
                        });
                    });
                }
                return accessor._data;
            };
            GLTFLoader.prototype._loadVertexBufferViewAsync = function (bufferView, kind) {
                var _this = this;
                if (bufferView._babylonBuffer) {
                    return bufferView._babylonBuffer;
                }
                bufferView._babylonBuffer = this.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView).then(function (data) {
                    return new BABYLON.Buffer(_this.babylonScene.getEngine(), data, false);
                });
                return bufferView._babylonBuffer;
            };
            GLTFLoader.prototype._loadVertexAccessorAsync = function (context, accessor, kind) {
                var _this = this;
                if (accessor._babylonVertexBuffer) {
                    return accessor._babylonVertexBuffer;
                }
                if (accessor.sparse) {
                    accessor._babylonVertexBuffer = this._loadFloatAccessorAsync("#/accessors/" + accessor.index, accessor).then(function (data) {
                        return new BABYLON.VertexBuffer(_this.babylonScene.getEngine(), data, kind, false);
                    });
                }
                // HACK: If byte offset is not a multiple of component type byte length then load as a float array instead of using Babylon buffers.
                else if (accessor.byteOffset && accessor.byteOffset % BABYLON.VertexBuffer.GetTypeByteLength(accessor.componentType) !== 0) {
                    BABYLON.Tools.Warn("Accessor byte offset is not a multiple of component type byte length");
                    accessor._babylonVertexBuffer = this._loadFloatAccessorAsync("#/accessors/" + accessor.index, accessor).then(function (data) {
                        return new BABYLON.VertexBuffer(_this.babylonScene.getEngine(), data, kind, false);
                    });
                }
                else {
                    var bufferView_1 = ArrayItem.Get(context + "/bufferView", this.gltf.bufferViews, accessor.bufferView);
                    accessor._babylonVertexBuffer = this._loadVertexBufferViewAsync(bufferView_1, kind).then(function (babylonBuffer) {
                        var size = GLTFLoader._GetNumComponents(context, accessor.type);
                        return new BABYLON.VertexBuffer(_this.babylonScene.getEngine(), babylonBuffer, kind, false, false, bufferView_1.byteStride, false, accessor.byteOffset, size, accessor.componentType, accessor.normalized, true);
                    });
                }
                return accessor._babylonVertexBuffer;
            };
            GLTFLoader.prototype._loadMaterialMetallicRoughnessPropertiesAsync = function (context, properties, babylonMaterial) {
                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                    throw new Error(context + ": Material type not supported");
                }
                var promises = new Array();
                if (properties) {
                    if (properties.baseColorFactor) {
                        babylonMaterial.albedoColor = BABYLON.Color3.FromArray(properties.baseColorFactor);
                        babylonMaterial.alpha = properties.baseColorFactor[3];
                    }
                    else {
                        babylonMaterial.albedoColor = BABYLON.Color3.White();
                    }
                    babylonMaterial.metallic = properties.metallicFactor == undefined ? 1 : properties.metallicFactor;
                    babylonMaterial.roughness = properties.roughnessFactor == undefined ? 1 : properties.roughnessFactor;
                    if (properties.baseColorTexture) {
                        promises.push(this.loadTextureInfoAsync(context + "/baseColorTexture", properties.baseColorTexture, function (texture) {
                            babylonMaterial.albedoTexture = texture;
                        }));
                    }
                    if (properties.metallicRoughnessTexture) {
                        promises.push(this.loadTextureInfoAsync(context + "/metallicRoughnessTexture", properties.metallicRoughnessTexture, function (texture) {
                            babylonMaterial.metallicTexture = texture;
                        }));
                        babylonMaterial.useMetallnessFromMetallicTextureBlue = true;
                        babylonMaterial.useRoughnessFromMetallicTextureGreen = true;
                        babylonMaterial.useRoughnessFromMetallicTextureAlpha = false;
                    }
                }
                return Promise.all(promises).then(function () { });
            };
            /** @hidden */
            GLTFLoader.prototype._loadMaterialAsync = function (context, material, babylonMesh, babylonDrawMode, assign) {
                if (assign === void 0) { assign = function () { }; }
                var extensionPromise = this._extensionsLoadMaterialAsync(context, material, babylonMesh, babylonDrawMode, assign);
                if (extensionPromise) {
                    return extensionPromise;
                }
                material._babylonData = material._babylonData || {};
                var babylonData = material._babylonData[babylonDrawMode];
                if (!babylonData) {
                    this.logOpen(context + " " + (material.name || ""));
                    var babylonMaterial = this.createMaterial(context, material, babylonDrawMode);
                    babylonData = {
                        material: babylonMaterial,
                        meshes: [],
                        promise: this.loadMaterialPropertiesAsync(context, material, babylonMaterial)
                    };
                    material._babylonData[babylonDrawMode] = babylonData;
                    this._parent.onMaterialLoadedObservable.notifyObservers(babylonMaterial);
                    this.logClose();
                }
                babylonData.meshes.push(babylonMesh);
                babylonMesh.onDisposeObservable.addOnce(function () {
                    var index = babylonData.meshes.indexOf(babylonMesh);
                    if (index !== -1) {
                        babylonData.meshes.splice(index, 1);
                    }
                });
                assign(babylonData.material);
                return babylonData.promise.then(function () {
                    return babylonData.material;
                });
            };
            GLTFLoader.prototype._createDefaultMaterial = function (name, babylonDrawMode) {
                var babylonMaterial = new BABYLON.PBRMaterial(name, this.babylonScene);
                babylonMaterial.sideOrientation = this.babylonScene.useRightHandedSystem ? BABYLON.Material.CounterClockWiseSideOrientation : BABYLON.Material.ClockWiseSideOrientation;
                babylonMaterial.fillMode = babylonDrawMode;
                babylonMaterial.enableSpecularAntiAliasing = true;
                babylonMaterial.useRadianceOverAlpha = !this._parent.transparencyAsCoverage;
                babylonMaterial.useSpecularOverAlpha = !this._parent.transparencyAsCoverage;
                babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
                babylonMaterial.metallic = 1;
                babylonMaterial.roughness = 1;
                return babylonMaterial;
            };
            /**
             * Creates a Babylon material from a glTF material.
             * @param context The context when loading the asset
             * @param material The glTF material property
             * @param babylonDrawMode The draw mode for the Babylon material
             * @returns The Babylon material
             */
            GLTFLoader.prototype.createMaterial = function (context, material, babylonDrawMode) {
                var extensionPromise = this._extensionsCreateMaterial(context, material, babylonDrawMode);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var name = material.name || "material" + material.index;
                return this._createDefaultMaterial(name, babylonDrawMode);
            };
            /**
             * Loads properties from a glTF material into a Babylon material.
             * @param context The context when loading the asset
             * @param material The glTF material property
             * @param babylonMaterial The Babylon material
             * @returns A promise that resolves when the load is complete
             */
            GLTFLoader.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                var extensionPromise = this._extensionsLoadMaterialPropertiesAsync(context, material, babylonMaterial);
                if (extensionPromise) {
                    return extensionPromise;
                }
                var promises = new Array();
                promises.push(this.loadMaterialBasePropertiesAsync(context, material, babylonMaterial));
                if (material.pbrMetallicRoughness) {
                    promises.push(this._loadMaterialMetallicRoughnessPropertiesAsync(context + "/pbrMetallicRoughness", material.pbrMetallicRoughness, babylonMaterial));
                }
                this.loadMaterialAlphaProperties(context, material, babylonMaterial);
                return Promise.all(promises).then(function () { });
            };
            /**
             * Loads the normal, occlusion, and emissive properties from a glTF material into a Babylon material.
             * @param context The context when loading the asset
             * @param material The glTF material property
             * @param babylonMaterial The Babylon material
             * @returns A promise that resolves when the load is complete
             */
            GLTFLoader.prototype.loadMaterialBasePropertiesAsync = function (context, material, babylonMaterial) {
                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                    throw new Error(context + ": Material type not supported");
                }
                var promises = new Array();
                babylonMaterial.emissiveColor = material.emissiveFactor ? BABYLON.Color3.FromArray(material.emissiveFactor) : new BABYLON.Color3(0, 0, 0);
                if (material.doubleSided) {
                    babylonMaterial.backFaceCulling = false;
                    babylonMaterial.twoSidedLighting = true;
                }
                if (material.normalTexture) {
                    promises.push(this.loadTextureInfoAsync(context + "/normalTexture", material.normalTexture, function (texture) {
                        babylonMaterial.bumpTexture = texture;
                    }));
                    babylonMaterial.invertNormalMapX = !this.babylonScene.useRightHandedSystem;
                    babylonMaterial.invertNormalMapY = this.babylonScene.useRightHandedSystem;
                    if (material.normalTexture.scale != undefined) {
                        babylonMaterial.bumpTexture.level = material.normalTexture.scale;
                    }
                }
                if (material.occlusionTexture) {
                    promises.push(this.loadTextureInfoAsync(context + "/occlusionTexture", material.occlusionTexture, function (texture) {
                        babylonMaterial.ambientTexture = texture;
                    }));
                    babylonMaterial.useAmbientInGrayScale = true;
                    if (material.occlusionTexture.strength != undefined) {
                        babylonMaterial.ambientTextureStrength = material.occlusionTexture.strength;
                    }
                }
                if (material.emissiveTexture) {
                    promises.push(this.loadTextureInfoAsync(context + "/emissiveTexture", material.emissiveTexture, function (texture) {
                        babylonMaterial.emissiveTexture = texture;
                    }));
                }
                return Promise.all(promises).then(function () { });
            };
            /**
             * Loads the alpha properties from a glTF material into a Babylon material.
             * Must be called after the setting the albedo texture of the Babylon material when the material has an albedo texture.
             * @param context The context when loading the asset
             * @param material The glTF material property
             * @param babylonMaterial The Babylon material
             */
            GLTFLoader.prototype.loadMaterialAlphaProperties = function (context, material, babylonMaterial) {
                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                    throw new Error(context + ": Material type not supported");
                }
                var alphaMode = material.alphaMode || "OPAQUE" /* OPAQUE */;
                switch (alphaMode) {
                    case "OPAQUE" /* OPAQUE */: {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
                        break;
                    }
                    case "MASK" /* MASK */: {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST;
                        babylonMaterial.alphaCutOff = (material.alphaCutoff == undefined ? 0.5 : material.alphaCutoff);
                        if (babylonMaterial.albedoTexture) {
                            babylonMaterial.albedoTexture.hasAlpha = true;
                        }
                        break;
                    }
                    case "BLEND" /* BLEND */: {
                        babylonMaterial.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
                        if (babylonMaterial.albedoTexture) {
                            babylonMaterial.albedoTexture.hasAlpha = true;
                            babylonMaterial.useAlphaFromAlbedoTexture = true;
                        }
                        break;
                    }
                    default: {
                        throw new Error(context + "/alphaMode: Invalid value (" + material.alphaMode + ")");
                    }
                }
            };
            /**
             * Loads a glTF texture info.
             * @param context The context when loading the asset
             * @param textureInfo The glTF texture info property
             * @param assign A function called synchronously after parsing the glTF properties
             * @returns A promise that resolves with the loaded Babylon texture when the load is complete
             */
            GLTFLoader.prototype.loadTextureInfoAsync = function (context, textureInfo, assign) {
                if (assign === void 0) { assign = function () { }; }
                var extensionPromise = this._extensionsLoadTextureInfoAsync(context, textureInfo, assign);
                if (extensionPromise) {
                    return extensionPromise;
                }
                this.logOpen("" + context);
                var texture = ArrayItem.Get(context + "/index", this.gltf.textures, textureInfo.index);
                var promise = this._loadTextureAsync("#/textures/" + textureInfo.index, texture, function (babylonTexture) {
                    babylonTexture.coordinatesIndex = textureInfo.texCoord || 0;
                    assign(babylonTexture);
                });
                this.logClose();
                return promise;
            };
            GLTFLoader.prototype._loadTextureAsync = function (context, texture, assign) {
                var _this = this;
                if (assign === void 0) { assign = function () { }; }
                var promises = new Array();
                this.logOpen(context + " " + (texture.name || ""));
                var sampler = (texture.sampler == undefined ? GLTFLoader._DefaultSampler : ArrayItem.Get(context + "/sampler", this.gltf.samplers, texture.sampler));
                var samplerData = this._loadSampler("#/samplers/" + sampler.index, sampler);
                var deferred = new BABYLON.Deferred();
                var babylonTexture = new BABYLON.Texture(null, this.babylonScene, samplerData.noMipMaps, false, samplerData.samplingMode, function () {
                    if (!_this._disposed) {
                        deferred.resolve();
                    }
                }, function (message, exception) {
                    if (!_this._disposed) {
                        deferred.reject(new Error(context + ": " + ((exception && exception.message) ? exception.message : message || "Failed to load texture")));
                    }
                });
                promises.push(deferred.promise);
                babylonTexture.name = texture.name || "texture" + texture.index;
                babylonTexture.wrapU = samplerData.wrapU;
                babylonTexture.wrapV = samplerData.wrapV;
                var image = ArrayItem.Get(context + "/source", this.gltf.images, texture.source);
                promises.push(this.loadImageAsync("#/images/" + image.index, image).then(function (data) {
                    var name = image.uri || _this._fileName + "#image" + image.index;
                    var dataUrl = "data:" + _this._uniqueRootUrl + name;
                    babylonTexture.updateURL(dataUrl, new Blob([data], { type: image.mimeType }));
                }));
                assign(babylonTexture);
                this._parent.onTextureLoadedObservable.notifyObservers(babylonTexture);
                this.logClose();
                return Promise.all(promises).then(function () {
                    return babylonTexture;
                });
            };
            GLTFLoader.prototype._loadSampler = function (context, sampler) {
                if (!sampler._data) {
                    sampler._data = {
                        noMipMaps: (sampler.minFilter === 9728 /* NEAREST */ || sampler.minFilter === 9729 /* LINEAR */),
                        samplingMode: GLTFLoader._GetTextureSamplingMode(context, sampler),
                        wrapU: GLTFLoader._GetTextureWrapMode(context + "/wrapS", sampler.wrapS),
                        wrapV: GLTFLoader._GetTextureWrapMode(context + "/wrapT", sampler.wrapT)
                    };
                }
                return sampler._data;
            };
            /**
             * Loads a glTF image.
             * @param context The context when loading the asset
             * @param image The glTF image property
             * @returns A promise that resolves with the loaded data when the load is complete
             */
            GLTFLoader.prototype.loadImageAsync = function (context, image) {
                if (!image._data) {
                    this.logOpen(context + " " + (image.name || ""));
                    if (image.uri) {
                        image._data = this.loadUriAsync(context + "/uri", image.uri);
                    }
                    else {
                        var bufferView = ArrayItem.Get(context + "/bufferView", this.gltf.bufferViews, image.bufferView);
                        image._data = this.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView);
                    }
                    this.logClose();
                }
                return image._data;
            };
            /**
             * Loads a glTF uri.
             * @param context The context when loading the asset
             * @param uri The base64 or relative uri
             * @returns A promise that resolves with the loaded data when the load is complete
             */
            GLTFLoader.prototype.loadUriAsync = function (context, uri) {
                var _this = this;
                var extensionPromise = this._extensionsLoadUriAsync(context, uri);
                if (extensionPromise) {
                    return extensionPromise;
                }
                if (!GLTFLoader._ValidateUri(uri)) {
                    throw new Error(context + ": '" + uri + "' is invalid");
                }
                if (BABYLON.Tools.IsBase64(uri)) {
                    var data = new Uint8Array(BABYLON.Tools.DecodeBase64(uri));
                    this.log("Decoded " + uri.substr(0, 64) + "... (" + data.length + " bytes)");
                    return Promise.resolve(data);
                }
                this.log("Loading " + uri);
                return this._parent.preprocessUrlAsync(this._rootUrl + uri).then(function (url) {
                    return new Promise(function (resolve, reject) {
                        if (!_this._disposed) {
                            var request_1 = BABYLON.Tools.LoadFile(url, function (fileData) {
                                if (!_this._disposed) {
                                    var data = new Uint8Array(fileData);
                                    _this.log("Loaded " + uri + " (" + data.length + " bytes)");
                                    resolve(data);
                                }
                            }, function (event) {
                                if (!_this._disposed) {
                                    if (request_1) {
                                        request_1._lengthComputable = event.lengthComputable;
                                        request_1._loaded = event.loaded;
                                        request_1._total = event.total;
                                    }
                                    if (_this._state === BABYLON.GLTFLoaderState.LOADING) {
                                        try {
                                            _this._onProgress();
                                        }
                                        catch (e) {
                                            reject(e);
                                        }
                                    }
                                }
                            }, _this.babylonScene.database, true, function (request, exception) {
                                if (!_this._disposed) {
                                    reject(new BABYLON.LoadFileError(context + ": Failed to load '" + uri + "'" + (request ? ": " + request.status + " " + request.statusText : ""), request));
                                }
                            });
                            _this._requests.push(request_1);
                        }
                    });
                });
            };
            GLTFLoader.prototype._onProgress = function () {
                if (!this._progressCallback) {
                    return;
                }
                var lengthComputable = true;
                var loaded = 0;
                var total = 0;
                for (var _i = 0, _a = this._requests; _i < _a.length; _i++) {
                    var request = _a[_i];
                    if (request._lengthComputable === undefined || request._loaded === undefined || request._total === undefined) {
                        return;
                    }
                    lengthComputable = lengthComputable && request._lengthComputable;
                    loaded += request._loaded;
                    total += request._total;
                }
                this._progressCallback(new BABYLON.SceneLoaderProgressEvent(lengthComputable, loaded, lengthComputable ? total : 0));
            };
            GLTFLoader._GetTextureWrapMode = function (context, mode) {
                // Set defaults if undefined
                mode = mode == undefined ? 10497 /* REPEAT */ : mode;
                switch (mode) {
                    case 33071 /* CLAMP_TO_EDGE */: return BABYLON.Texture.CLAMP_ADDRESSMODE;
                    case 33648 /* MIRRORED_REPEAT */: return BABYLON.Texture.MIRROR_ADDRESSMODE;
                    case 10497 /* REPEAT */: return BABYLON.Texture.WRAP_ADDRESSMODE;
                    default:
                        BABYLON.Tools.Warn(context + ": Invalid value (" + mode + ")");
                        return BABYLON.Texture.WRAP_ADDRESSMODE;
                }
            };
            GLTFLoader._GetTextureSamplingMode = function (context, sampler) {
                // Set defaults if undefined
                var magFilter = sampler.magFilter == undefined ? 9729 /* LINEAR */ : sampler.magFilter;
                var minFilter = sampler.minFilter == undefined ? 9987 /* LINEAR_MIPMAP_LINEAR */ : sampler.minFilter;
                if (magFilter === 9729 /* LINEAR */) {
                    switch (minFilter) {
                        case 9728 /* NEAREST */: return BABYLON.Texture.LINEAR_NEAREST;
                        case 9729 /* LINEAR */: return BABYLON.Texture.LINEAR_LINEAR;
                        case 9984 /* NEAREST_MIPMAP_NEAREST */: return BABYLON.Texture.LINEAR_NEAREST_MIPNEAREST;
                        case 9985 /* LINEAR_MIPMAP_NEAREST */: return BABYLON.Texture.LINEAR_LINEAR_MIPNEAREST;
                        case 9986 /* NEAREST_MIPMAP_LINEAR */: return BABYLON.Texture.LINEAR_NEAREST_MIPLINEAR;
                        case 9987 /* LINEAR_MIPMAP_LINEAR */: return BABYLON.Texture.LINEAR_LINEAR_MIPLINEAR;
                        default:
                            BABYLON.Tools.Warn(context + "/minFilter: Invalid value (" + minFilter + ")");
                            return BABYLON.Texture.LINEAR_LINEAR_MIPLINEAR;
                    }
                }
                else {
                    if (magFilter !== 9728 /* NEAREST */) {
                        BABYLON.Tools.Warn(context + "/magFilter: Invalid value (" + magFilter + ")");
                    }
                    switch (minFilter) {
                        case 9728 /* NEAREST */: return BABYLON.Texture.NEAREST_NEAREST;
                        case 9729 /* LINEAR */: return BABYLON.Texture.NEAREST_LINEAR;
                        case 9984 /* NEAREST_MIPMAP_NEAREST */: return BABYLON.Texture.NEAREST_NEAREST_MIPNEAREST;
                        case 9985 /* LINEAR_MIPMAP_NEAREST */: return BABYLON.Texture.NEAREST_LINEAR_MIPNEAREST;
                        case 9986 /* NEAREST_MIPMAP_LINEAR */: return BABYLON.Texture.NEAREST_NEAREST_MIPLINEAR;
                        case 9987 /* LINEAR_MIPMAP_LINEAR */: return BABYLON.Texture.NEAREST_LINEAR_MIPLINEAR;
                        default:
                            BABYLON.Tools.Warn(context + "/minFilter: Invalid value (" + minFilter + ")");
                            return BABYLON.Texture.NEAREST_NEAREST_MIPNEAREST;
                    }
                }
            };
            GLTFLoader._GetTypedArray = function (context, componentType, bufferView, byteOffset, length) {
                var buffer = bufferView.buffer;
                byteOffset = bufferView.byteOffset + (byteOffset || 0);
                try {
                    switch (componentType) {
                        case 5120 /* BYTE */: return new Int8Array(buffer, byteOffset, length);
                        case 5121 /* UNSIGNED_BYTE */: return new Uint8Array(buffer, byteOffset, length);
                        case 5122 /* SHORT */: return new Int16Array(buffer, byteOffset, length);
                        case 5123 /* UNSIGNED_SHORT */: return new Uint16Array(buffer, byteOffset, length);
                        case 5125 /* UNSIGNED_INT */: return new Uint32Array(buffer, byteOffset, length);
                        case 5126 /* FLOAT */: return new Float32Array(buffer, byteOffset, length);
                        default: throw new Error("Invalid component type " + componentType);
                    }
                }
                catch (e) {
                    throw new Error(context + ": " + e);
                }
            };
            GLTFLoader._GetNumComponents = function (context, type) {
                switch (type) {
                    case "SCALAR": return 1;
                    case "VEC2": return 2;
                    case "VEC3": return 3;
                    case "VEC4": return 4;
                    case "MAT2": return 4;
                    case "MAT3": return 9;
                    case "MAT4": return 16;
                }
                throw new Error(context + ": Invalid type (" + type + ")");
            };
            GLTFLoader._ValidateUri = function (uri) {
                return (BABYLON.Tools.IsBase64(uri) || uri.indexOf("..") === -1);
            };
            GLTFLoader._GetDrawMode = function (context, mode) {
                if (mode == undefined) {
                    mode = 4 /* TRIANGLES */;
                }
                switch (mode) {
                    case 0 /* POINTS */: return BABYLON.Material.PointListDrawMode;
                    case 1 /* LINES */: return BABYLON.Material.LineListDrawMode;
                    case 2 /* LINE_LOOP */: return BABYLON.Material.LineLoopDrawMode;
                    case 3 /* LINE_STRIP */: return BABYLON.Material.LineStripDrawMode;
                    case 4 /* TRIANGLES */: return BABYLON.Material.TriangleFillMode;
                    case 5 /* TRIANGLE_STRIP */: return BABYLON.Material.TriangleStripDrawMode;
                    case 6 /* TRIANGLE_FAN */: return BABYLON.Material.TriangleFanDrawMode;
                }
                throw new Error(context + ": Invalid mesh primitive mode (" + mode + ")");
            };
            GLTFLoader.prototype._compileMaterialsAsync = function () {
                var _this = this;
                this._parent._startPerformanceCounter("Compile materials");
                var promises = new Array();
                if (this.gltf.materials) {
                    for (var _i = 0, _a = this.gltf.materials; _i < _a.length; _i++) {
                        var material = _a[_i];
                        if (material._babylonData) {
                            for (var babylonDrawMode in material._babylonData) {
                                var babylonData = material._babylonData[babylonDrawMode];
                                for (var _b = 0, _c = babylonData.meshes; _b < _c.length; _b++) {
                                    var babylonMesh = _c[_b];
                                    // Ensure nonUniformScaling is set if necessary.
                                    babylonMesh.computeWorldMatrix(true);
                                    var babylonMaterial = babylonData.material;
                                    promises.push(babylonMaterial.forceCompilationAsync(babylonMesh));
                                    if (this._parent.useClipPlane) {
                                        promises.push(babylonMaterial.forceCompilationAsync(babylonMesh, { clipPlane: true }));
                                    }
                                }
                            }
                        }
                    }
                }
                return Promise.all(promises).then(function () {
                    _this._parent._endPerformanceCounter("Compile materials");
                });
            };
            GLTFLoader.prototype._compileShadowGeneratorsAsync = function () {
                var _this = this;
                this._parent._startPerformanceCounter("Compile shadow generators");
                var promises = new Array();
                var lights = this.babylonScene.lights;
                for (var _i = 0, lights_1 = lights; _i < lights_1.length; _i++) {
                    var light = lights_1[_i];
                    var generator = light.getShadowGenerator();
                    if (generator) {
                        promises.push(generator.forceCompilationAsync());
                    }
                }
                return Promise.all(promises).then(function () {
                    _this._parent._endPerformanceCounter("Compile shadow generators");
                });
            };
            GLTFLoader.prototype._forEachExtensions = function (action) {
                for (var _i = 0, _a = GLTFLoader._ExtensionNames; _i < _a.length; _i++) {
                    var name_4 = _a[_i];
                    var extension = this._extensions[name_4];
                    if (extension.enabled) {
                        action(extension);
                    }
                }
            };
            GLTFLoader.prototype._applyExtensions = function (property, actionAsync) {
                for (var _i = 0, _a = GLTFLoader._ExtensionNames; _i < _a.length; _i++) {
                    var name_5 = _a[_i];
                    var extension = this._extensions[name_5];
                    if (extension.enabled) {
                        var loaderProperty = property;
                        loaderProperty._activeLoaderExtensions = loaderProperty._activeLoaderExtensions || {};
                        var activeLoaderExtensions = loaderProperty._activeLoaderExtensions;
                        if (!activeLoaderExtensions[name_5]) {
                            activeLoaderExtensions[name_5] = true;
                            try {
                                var result = actionAsync(extension);
                                if (result) {
                                    return result;
                                }
                            }
                            finally {
                                delete activeLoaderExtensions[name_5];
                            }
                        }
                    }
                }
                return null;
            };
            GLTFLoader.prototype._extensionsOnLoading = function () {
                this._forEachExtensions(function (extension) { return extension.onLoading && extension.onLoading(); });
            };
            GLTFLoader.prototype._extensionsOnReady = function () {
                this._forEachExtensions(function (extension) { return extension.onReady && extension.onReady(); });
            };
            GLTFLoader.prototype._extensionsLoadSceneAsync = function (context, scene) {
                return this._applyExtensions(scene, function (extension) { return extension.loadSceneAsync && extension.loadSceneAsync(context, scene); });
            };
            GLTFLoader.prototype._extensionsLoadNodeAsync = function (context, node, assign) {
                return this._applyExtensions(node, function (extension) { return extension.loadNodeAsync && extension.loadNodeAsync(context, node, assign); });
            };
            GLTFLoader.prototype._extensionsLoadCameraAsync = function (context, camera, assign) {
                return this._applyExtensions(camera, function (extension) { return extension.loadCameraAsync && extension.loadCameraAsync(context, camera, assign); });
            };
            GLTFLoader.prototype._extensionsLoadVertexDataAsync = function (context, primitive, babylonMesh) {
                return this._applyExtensions(primitive, function (extension) { return extension._loadVertexDataAsync && extension._loadVertexDataAsync(context, primitive, babylonMesh); });
            };
            GLTFLoader.prototype._extensionsLoadMaterialAsync = function (context, material, babylonMesh, babylonDrawMode, assign) {
                return this._applyExtensions(material, function (extension) { return extension._loadMaterialAsync && extension._loadMaterialAsync(context, material, babylonMesh, babylonDrawMode, assign); });
            };
            GLTFLoader.prototype._extensionsCreateMaterial = function (context, material, babylonDrawMode) {
                return this._applyExtensions({}, function (extension) { return extension.createMaterial && extension.createMaterial(context, material, babylonDrawMode); });
            };
            GLTFLoader.prototype._extensionsLoadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                return this._applyExtensions(material, function (extension) { return extension.loadMaterialPropertiesAsync && extension.loadMaterialPropertiesAsync(context, material, babylonMaterial); });
            };
            GLTFLoader.prototype._extensionsLoadTextureInfoAsync = function (context, textureInfo, assign) {
                return this._applyExtensions(textureInfo, function (extension) { return extension.loadTextureInfoAsync && extension.loadTextureInfoAsync(context, textureInfo, assign); });
            };
            GLTFLoader.prototype._extensionsLoadAnimationAsync = function (context, animation) {
                return this._applyExtensions(animation, function (extension) { return extension.loadAnimationAsync && extension.loadAnimationAsync(context, animation); });
            };
            GLTFLoader.prototype._extensionsLoadUriAsync = function (context, uri) {
                return this._applyExtensions({}, function (extension) { return extension._loadUriAsync && extension._loadUriAsync(context, uri); });
            };
            /**
             * Helper method called by a loader extension to load an glTF extension.
             * @param context The context when loading the asset
             * @param property The glTF property to load the extension from
             * @param extensionName The name of the extension to load
             * @param actionAsync The action to run
             * @returns The promise returned by actionAsync or null if the extension does not exist
             */
            GLTFLoader.LoadExtensionAsync = function (context, property, extensionName, actionAsync) {
                if (!property.extensions) {
                    return null;
                }
                var extensions = property.extensions;
                var extension = extensions[extensionName];
                if (!extension) {
                    return null;
                }
                return actionAsync(context + "/extensions/" + extensionName, extension);
            };
            /**
             * Helper method called by a loader extension to load a glTF extra.
             * @param context The context when loading the asset
             * @param property The glTF property to load the extra from
             * @param extensionName The name of the extension to load
             * @param actionAsync The action to run
             * @returns The promise returned by actionAsync or null if the extra does not exist
             */
            GLTFLoader.LoadExtraAsync = function (context, property, extensionName, actionAsync) {
                if (!property.extras) {
                    return null;
                }
                var extras = property.extras;
                var extra = extras[extensionName];
                if (!extra) {
                    return null;
                }
                return actionAsync(context + "/extras/" + extensionName, extra);
            };
            /**
             * Increments the indentation level and logs a message.
             * @param message The message to log
             */
            GLTFLoader.prototype.logOpen = function (message) {
                this._parent._logOpen(message);
            };
            /**
             * Decrements the indentation level.
             */
            GLTFLoader.prototype.logClose = function () {
                this._parent._logClose();
            };
            /**
             * Logs a message
             * @param message The message to log
             */
            GLTFLoader.prototype.log = function (message) {
                this._parent._log(message);
            };
            /**
             * Starts a performance counter.
             * @param counterName The name of the performance counter
             */
            GLTFLoader.prototype.startPerformanceCounter = function (counterName) {
                this._parent._startPerformanceCounter(counterName);
            };
            /**
             * Ends a performance counter.
             * @param counterName The name of the performance counter
             */
            GLTFLoader.prototype.endPerformanceCounter = function (counterName) {
                this._parent._endPerformanceCounter(counterName);
            };
            GLTFLoader._DefaultSampler = { index: -1 };
            GLTFLoader._ExtensionNames = new Array();
            GLTFLoader._ExtensionFactories = {};
            return GLTFLoader;
        }());
        GLTF2.GLTFLoader = GLTFLoader;
        BABYLON.GLTFFileLoader._CreateGLTFLoaderV2 = function (parent) { return new GLTFLoader(parent); };
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.glTFLoader.js.map

/// <reference path="../../../../dist/preview release/babylon.d.ts"/>

//# sourceMappingURL=babylon.glTFLoaderExtension.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "MSFT_lod";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/MSFT_lod)
                 */
                var MSFT_lod = /** @class */ (function () {
                    /** @hidden */
                    function MSFT_lod(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        /**
                         * Maximum number of LODs to load, starting from the lowest LOD.
                         */
                        this.maxLODsToLoad = Number.MAX_VALUE;
                        /**
                         * Observable raised when all node LODs of one level are loaded.
                         * The event data is the index of the loaded LOD starting from zero.
                         * Dispose the loader to cancel the loading of the next level of LODs.
                         */
                        this.onNodeLODsLoadedObservable = new BABYLON.Observable();
                        /**
                         * Observable raised when all material LODs of one level are loaded.
                         * The event data is the index of the loaded LOD starting from zero.
                         * Dispose the loader to cancel the loading of the next level of LODs.
                         */
                        this.onMaterialLODsLoadedObservable = new BABYLON.Observable();
                        this._nodeIndexLOD = null;
                        this._nodeSignalLODs = new Array();
                        this._nodePromiseLODs = new Array();
                        this._materialIndexLOD = null;
                        this._materialSignalLODs = new Array();
                        this._materialPromiseLODs = new Array();
                        this._loader = loader;
                    }
                    /** @hidden */
                    MSFT_lod.prototype.dispose = function () {
                        delete this._loader;
                        this._nodeIndexLOD = null;
                        this._nodeSignalLODs.length = 0;
                        this._nodePromiseLODs.length = 0;
                        this._materialIndexLOD = null;
                        this._materialSignalLODs.length = 0;
                        this._materialPromiseLODs.length = 0;
                        this.onMaterialLODsLoadedObservable.clear();
                        this.onNodeLODsLoadedObservable.clear();
                    };
                    /** @hidden */
                    MSFT_lod.prototype.onReady = function () {
                        var _this = this;
                        var _loop_1 = function (indexLOD) {
                            var promise = Promise.all(this_1._nodePromiseLODs[indexLOD]).then(function () {
                                if (indexLOD !== 0) {
                                    _this._loader.endPerformanceCounter("Node LOD " + indexLOD);
                                }
                                _this._loader.log("Loaded node LOD " + indexLOD);
                                _this.onNodeLODsLoadedObservable.notifyObservers(indexLOD);
                                if (indexLOD !== _this._nodePromiseLODs.length - 1) {
                                    _this._loader.startPerformanceCounter("Node LOD " + (indexLOD + 1));
                                    if (_this._nodeSignalLODs[indexLOD]) {
                                        _this._nodeSignalLODs[indexLOD].resolve();
                                    }
                                }
                            });
                            this_1._loader._completePromises.push(promise);
                        };
                        var this_1 = this;
                        for (var indexLOD = 0; indexLOD < this._nodePromiseLODs.length; indexLOD++) {
                            _loop_1(indexLOD);
                        }
                        var _loop_2 = function (indexLOD) {
                            var promise = Promise.all(this_2._materialPromiseLODs[indexLOD]).then(function () {
                                if (indexLOD !== 0) {
                                    _this._loader.endPerformanceCounter("Material LOD " + indexLOD);
                                }
                                _this._loader.log("Loaded material LOD " + indexLOD);
                                _this.onMaterialLODsLoadedObservable.notifyObservers(indexLOD);
                                if (indexLOD !== _this._materialPromiseLODs.length - 1) {
                                    _this._loader.startPerformanceCounter("Material LOD " + (indexLOD + 1));
                                    if (_this._materialSignalLODs[indexLOD]) {
                                        _this._materialSignalLODs[indexLOD].resolve();
                                    }
                                }
                            });
                            this_2._loader._completePromises.push(promise);
                        };
                        var this_2 = this;
                        for (var indexLOD = 0; indexLOD < this._materialPromiseLODs.length; indexLOD++) {
                            _loop_2(indexLOD);
                        }
                    };
                    /** @hidden */
                    MSFT_lod.prototype.loadNodeAsync = function (context, node, assign) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, node, this.name, function (extensionContext, extension) {
                            var firstPromise;
                            var nodeLODs = _this._getLODs(extensionContext, node, _this._loader.gltf.nodes, extension.ids);
                            _this._loader.logOpen("" + extensionContext);
                            var _loop_3 = function (indexLOD) {
                                var nodeLOD = nodeLODs[indexLOD];
                                if (indexLOD !== 0) {
                                    _this._nodeIndexLOD = indexLOD;
                                    _this._nodeSignalLODs[indexLOD] = _this._nodeSignalLODs[indexLOD] || new BABYLON.Deferred();
                                }
                                var promise = _this._loader.loadNodeAsync("#/nodes/" + nodeLOD.index, nodeLOD).then(function (babylonMesh) {
                                    if (indexLOD !== 0) {
                                        // TODO: should not rely on _babylonMesh
                                        var previousNodeLOD = nodeLODs[indexLOD - 1];
                                        if (previousNodeLOD._babylonMesh) {
                                            previousNodeLOD._babylonMesh.dispose();
                                            delete previousNodeLOD._babylonMesh;
                                            _this._disposeUnusedMaterials();
                                        }
                                    }
                                    return babylonMesh;
                                });
                                if (indexLOD === 0) {
                                    firstPromise = promise;
                                }
                                else {
                                    _this._nodeIndexLOD = null;
                                }
                                _this._nodePromiseLODs[indexLOD] = _this._nodePromiseLODs[indexLOD] || [];
                                _this._nodePromiseLODs[indexLOD].push(promise);
                            };
                            for (var indexLOD = 0; indexLOD < nodeLODs.length; indexLOD++) {
                                _loop_3(indexLOD);
                            }
                            _this._loader.logClose();
                            return firstPromise;
                        });
                    };
                    /** @hidden */
                    MSFT_lod.prototype._loadMaterialAsync = function (context, material, babylonMesh, babylonDrawMode, assign) {
                        var _this = this;
                        // Don't load material LODs if already loading a node LOD.
                        if (this._nodeIndexLOD) {
                            return null;
                        }
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, material, this.name, function (extensionContext, extension) {
                            var firstPromise;
                            var materialLODs = _this._getLODs(extensionContext, material, _this._loader.gltf.materials, extension.ids);
                            _this._loader.logOpen("" + extensionContext);
                            var _loop_4 = function (indexLOD) {
                                var materialLOD = materialLODs[indexLOD];
                                if (indexLOD !== 0) {
                                    _this._materialIndexLOD = indexLOD;
                                }
                                var promise = _this._loader._loadMaterialAsync("#/materials/" + materialLOD.index, materialLOD, babylonMesh, babylonDrawMode, function (babylonMaterial) {
                                    if (indexLOD === 0) {
                                        assign(babylonMaterial);
                                    }
                                }).then(function (babylonMaterial) {
                                    if (indexLOD !== 0) {
                                        assign(babylonMaterial);
                                        // TODO: should not rely on _babylonData
                                        var previousBabylonDataLOD = materialLODs[indexLOD - 1]._babylonData;
                                        if (previousBabylonDataLOD[babylonDrawMode]) {
                                            previousBabylonDataLOD[babylonDrawMode].material.dispose();
                                            delete previousBabylonDataLOD[babylonDrawMode];
                                        }
                                    }
                                    return babylonMaterial;
                                });
                                if (indexLOD === 0) {
                                    firstPromise = promise;
                                }
                                else {
                                    _this._materialIndexLOD = null;
                                }
                                _this._materialPromiseLODs[indexLOD] = _this._materialPromiseLODs[indexLOD] || [];
                                _this._materialPromiseLODs[indexLOD].push(promise);
                            };
                            for (var indexLOD = 0; indexLOD < materialLODs.length; indexLOD++) {
                                _loop_4(indexLOD);
                            }
                            _this._loader.logClose();
                            return firstPromise;
                        });
                    };
                    /** @hidden */
                    MSFT_lod.prototype._loadUriAsync = function (context, uri) {
                        var _this = this;
                        // Defer the loading of uris if loading a material or node LOD.
                        if (this._materialIndexLOD !== null) {
                            this._loader.log("deferred");
                            var previousIndexLOD = this._materialIndexLOD - 1;
                            this._materialSignalLODs[previousIndexLOD] = this._materialSignalLODs[previousIndexLOD] || new BABYLON.Deferred();
                            return this._materialSignalLODs[previousIndexLOD].promise.then(function () {
                                return _this._loader.loadUriAsync(context, uri);
                            });
                        }
                        else if (this._nodeIndexLOD !== null) {
                            this._loader.log("deferred");
                            var previousIndexLOD = this._nodeIndexLOD - 1;
                            this._nodeSignalLODs[previousIndexLOD] = this._nodeSignalLODs[previousIndexLOD] || new BABYLON.Deferred();
                            return this._nodeSignalLODs[this._nodeIndexLOD - 1].promise.then(function () {
                                return _this._loader.loadUriAsync(context, uri);
                            });
                        }
                        return null;
                    };
                    /**
                     * Gets an array of LOD properties from lowest to highest.
                     */
                    MSFT_lod.prototype._getLODs = function (context, property, array, ids) {
                        if (this.maxLODsToLoad <= 0) {
                            throw new Error("maxLODsToLoad must be greater than zero");
                        }
                        var properties = new Array();
                        for (var i = ids.length - 1; i >= 0; i--) {
                            properties.push(GLTF2.ArrayItem.Get(context + "/ids/" + ids[i], array, ids[i]));
                            if (properties.length === this.maxLODsToLoad) {
                                return properties;
                            }
                        }
                        properties.push(property);
                        return properties;
                    };
                    MSFT_lod.prototype._disposeUnusedMaterials = function () {
                        // TODO: should not rely on _babylonData
                        var materials = this._loader.gltf.materials;
                        if (materials) {
                            for (var _i = 0, materials_1 = materials; _i < materials_1.length; _i++) {
                                var material = materials_1[_i];
                                if (material._babylonData) {
                                    for (var drawMode in material._babylonData) {
                                        var babylonData = material._babylonData[drawMode];
                                        if (babylonData.meshes.length === 0) {
                                            babylonData.material.dispose(false, true);
                                            delete material._babylonData[drawMode];
                                        }
                                    }
                                }
                            }
                        }
                    };
                    return MSFT_lod;
                }());
                Extensions.MSFT_lod = MSFT_lod;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new MSFT_lod(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=MSFT_lod.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "MSFT_minecraftMesh";
                /** @hidden */
                var MSFT_minecraftMesh = /** @class */ (function () {
                    function MSFT_minecraftMesh(loader) {
                        this.name = NAME;
                        this.enabled = true;
                        this._loader = loader;
                    }
                    MSFT_minecraftMesh.prototype.dispose = function () {
                        delete this._loader;
                    };
                    MSFT_minecraftMesh.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtraAsync(context, material, this.name, function (extraContext, extra) {
                            if (extra) {
                                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                                    throw new Error(extraContext + ": Material type not supported");
                                }
                                var promise = _this._loader.loadMaterialPropertiesAsync(context, material, babylonMaterial);
                                if (babylonMaterial.needAlphaBlending()) {
                                    babylonMaterial.forceDepthWrite = true;
                                    babylonMaterial.separateCullingPass = true;
                                }
                                babylonMaterial.backFaceCulling = babylonMaterial.forceDepthWrite;
                                babylonMaterial.twoSidedLighting = true;
                                return promise;
                            }
                            return null;
                        });
                    };
                    return MSFT_minecraftMesh;
                }());
                Extensions.MSFT_minecraftMesh = MSFT_minecraftMesh;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new MSFT_minecraftMesh(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=MSFT_minecraftMesh.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "MSFT_sRGBFactors";
                /** @hidden */
                var MSFT_sRGBFactors = /** @class */ (function () {
                    function MSFT_sRGBFactors(loader) {
                        this.name = NAME;
                        this.enabled = true;
                        this._loader = loader;
                    }
                    MSFT_sRGBFactors.prototype.dispose = function () {
                        delete this._loader;
                    };
                    MSFT_sRGBFactors.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtraAsync(context, material, this.name, function (extraContext, extra) {
                            if (extra) {
                                if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                                    throw new Error(extraContext + ": Material type not supported");
                                }
                                var promise = _this._loader.loadMaterialPropertiesAsync(context, material, babylonMaterial);
                                if (!babylonMaterial.albedoTexture) {
                                    babylonMaterial.albedoColor.toLinearSpaceToRef(babylonMaterial.albedoColor);
                                }
                                if (!babylonMaterial.reflectivityTexture) {
                                    babylonMaterial.reflectivityColor.toLinearSpaceToRef(babylonMaterial.reflectivityColor);
                                }
                                return promise;
                            }
                            return null;
                        });
                    };
                    return MSFT_sRGBFactors;
                }());
                Extensions.MSFT_sRGBFactors = MSFT_sRGBFactors;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new MSFT_sRGBFactors(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=MSFT_sRGBFactors.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "MSFT_audio_emitter";
                /**
                 * [Specification](https://github.com/najadojo/glTF/tree/MSFT_audio_emitter/extensions/2.0/Vendor/MSFT_audio_emitter)
                 */
                var MSFT_audio_emitter = /** @class */ (function () {
                    /** @hidden */
                    function MSFT_audio_emitter(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    MSFT_audio_emitter.prototype.dispose = function () {
                        delete this._loader;
                        delete this._clips;
                        delete this._emitters;
                    };
                    /** @hidden */
                    MSFT_audio_emitter.prototype.onLoading = function () {
                        var extensions = this._loader.gltf.extensions;
                        if (extensions && extensions[this.name]) {
                            var extension = extensions[this.name];
                            this._clips = extension.clips;
                            this._emitters = extension.emitters;
                            GLTF2.ArrayItem.Assign(this._clips);
                            GLTF2.ArrayItem.Assign(this._emitters);
                        }
                    };
                    /** @hidden */
                    MSFT_audio_emitter.prototype.loadSceneAsync = function (context, scene) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, scene, this.name, function (extensionContext, extension) {
                            var promises = new Array();
                            promises.push(_this._loader.loadSceneAsync(context, scene));
                            for (var _i = 0, _a = extension.emitters; _i < _a.length; _i++) {
                                var emitterIndex = _a[_i];
                                var emitter = GLTF2.ArrayItem.Get(extensionContext + "/emitters", _this._emitters, emitterIndex);
                                if (emitter.refDistance != undefined || emitter.maxDistance != undefined || emitter.rolloffFactor != undefined ||
                                    emitter.distanceModel != undefined || emitter.innerAngle != undefined || emitter.outerAngle != undefined) {
                                    throw new Error(extensionContext + ": Direction or Distance properties are not allowed on emitters attached to a scene");
                                }
                                promises.push(_this._loadEmitterAsync(extensionContext + "/emitters/" + emitter.index, emitter));
                            }
                            return Promise.all(promises).then(function () { });
                        });
                    };
                    /** @hidden */
                    MSFT_audio_emitter.prototype.loadNodeAsync = function (context, node, assign) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, node, this.name, function (extensionContext, extension) {
                            var promises = new Array();
                            return _this._loader.loadNodeAsync(extensionContext, node, function (babylonMesh) {
                                var _loop_1 = function (emitterIndex) {
                                    var emitter = GLTF2.ArrayItem.Get(extensionContext + "/emitters", _this._emitters, emitterIndex);
                                    promises.push(_this._loadEmitterAsync(extensionContext + "/emitters/" + emitter.index, emitter).then(function () {
                                        for (var _i = 0, _a = emitter._babylonSounds; _i < _a.length; _i++) {
                                            var sound = _a[_i];
                                            sound.attachToMesh(babylonMesh);
                                            if (emitter.innerAngle != undefined || emitter.outerAngle != undefined) {
                                                sound.setLocalDirectionToMesh(BABYLON.Vector3.Forward());
                                                sound.setDirectionalCone(2 * BABYLON.Tools.ToDegrees(emitter.innerAngle == undefined ? Math.PI : emitter.innerAngle), 2 * BABYLON.Tools.ToDegrees(emitter.outerAngle == undefined ? Math.PI : emitter.outerAngle), 0);
                                            }
                                        }
                                    }));
                                };
                                for (var _i = 0, _a = extension.emitters; _i < _a.length; _i++) {
                                    var emitterIndex = _a[_i];
                                    _loop_1(emitterIndex);
                                }
                                assign(babylonMesh);
                            }).then(function (babylonMesh) {
                                return Promise.all(promises).then(function () {
                                    return babylonMesh;
                                });
                            });
                        });
                    };
                    /** @hidden */
                    MSFT_audio_emitter.prototype.loadAnimationAsync = function (context, animation) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, animation, this.name, function (extensionContext, extension) {
                            return _this._loader.loadAnimationAsync(context, animation).then(function (babylonAnimationGroup) {
                                var promises = new Array();
                                GLTF2.ArrayItem.Assign(extension.events);
                                for (var _i = 0, _a = extension.events; _i < _a.length; _i++) {
                                    var event_1 = _a[_i];
                                    promises.push(_this._loadAnimationEventAsync(extensionContext + "/events/" + event_1.index, context, animation, event_1, babylonAnimationGroup));
                                }
                                return Promise.all(promises).then(function () {
                                    return babylonAnimationGroup;
                                });
                            });
                        });
                    };
                    MSFT_audio_emitter.prototype._loadClipAsync = function (context, clip) {
                        if (clip._objectURL) {
                            return clip._objectURL;
                        }
                        var promise;
                        if (clip.uri) {
                            promise = this._loader.loadUriAsync(context, clip.uri);
                        }
                        else {
                            var bufferView = GLTF2.ArrayItem.Get(context + "/bufferView", this._loader.gltf.bufferViews, clip.bufferView);
                            promise = this._loader.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView);
                        }
                        clip._objectURL = promise.then(function (data) {
                            return URL.createObjectURL(new Blob([data], { type: clip.mimeType }));
                        });
                        return clip._objectURL;
                    };
                    MSFT_audio_emitter.prototype._loadEmitterAsync = function (context, emitter) {
                        var _this = this;
                        emitter._babylonSounds = emitter._babylonSounds || [];
                        if (!emitter._babylonData) {
                            var clipPromises = new Array();
                            var name_1 = emitter.name || "emitter" + emitter.index;
                            var options_1 = {
                                loop: false,
                                autoplay: false,
                                volume: emitter.volume == undefined ? 1 : emitter.volume,
                            };
                            var _loop_2 = function (i) {
                                var clipContext = "#/extensions/" + this_1.name + "/clips";
                                var clip = GLTF2.ArrayItem.Get(clipContext, this_1._clips, emitter.clips[i].clip);
                                clipPromises.push(this_1._loadClipAsync(clipContext + "/" + emitter.clips[i].clip, clip).then(function (objectURL) {
                                    var sound = emitter._babylonSounds[i] = new BABYLON.Sound(name_1, objectURL, _this._loader.babylonScene, null, options_1);
                                    sound.refDistance = emitter.refDistance || 1;
                                    sound.maxDistance = emitter.maxDistance || 256;
                                    sound.rolloffFactor = emitter.rolloffFactor || 1;
                                    sound.distanceModel = emitter.distanceModel || 'exponential';
                                    sound._positionInEmitterSpace = true;
                                }));
                            };
                            var this_1 = this;
                            for (var i = 0; i < emitter.clips.length; i++) {
                                _loop_2(i);
                            }
                            var promise = Promise.all(clipPromises).then(function () {
                                var weights = emitter.clips.map(function (clip) { return clip.weight || 1; });
                                var weightedSound = new BABYLON.WeightedSound(emitter.loop || false, emitter._babylonSounds, weights);
                                if (emitter.innerAngle) {
                                    weightedSound.directionalConeInnerAngle = 2 * BABYLON.Tools.ToDegrees(emitter.innerAngle);
                                }
                                if (emitter.outerAngle) {
                                    weightedSound.directionalConeOuterAngle = 2 * BABYLON.Tools.ToDegrees(emitter.outerAngle);
                                }
                                if (emitter.volume) {
                                    weightedSound.volume = emitter.volume;
                                }
                                emitter._babylonData.sound = weightedSound;
                            });
                            emitter._babylonData = {
                                loaded: promise
                            };
                        }
                        return emitter._babylonData.loaded;
                    };
                    MSFT_audio_emitter.prototype._getEventAction = function (context, sound, action, time, startOffset) {
                        switch (action) {
                            case "play" /* play */: {
                                return function (currentFrame) {
                                    var frameOffset = (startOffset || 0) + (currentFrame - time);
                                    sound.play(frameOffset);
                                };
                            }
                            case "stop" /* stop */: {
                                return function (currentFrame) {
                                    sound.stop();
                                };
                            }
                            case "pause" /* pause */: {
                                return function (currentFrame) {
                                    sound.pause();
                                };
                            }
                            default: {
                                throw new Error(context + ": Unsupported action " + action);
                            }
                        }
                    };
                    MSFT_audio_emitter.prototype._loadAnimationEventAsync = function (context, animationContext, animation, event, babylonAnimationGroup) {
                        var _this = this;
                        if (babylonAnimationGroup.targetedAnimations.length == 0) {
                            return Promise.resolve();
                        }
                        var babylonAnimation = babylonAnimationGroup.targetedAnimations[0];
                        var emitterIndex = event.emitter;
                        var emitter = GLTF2.ArrayItem.Get("#/extensions/" + this.name + "/emitters", this._emitters, emitterIndex);
                        return this._loadEmitterAsync(context, emitter).then(function () {
                            var sound = emitter._babylonData.sound;
                            if (sound) {
                                var babylonAnimationEvent = new BABYLON.AnimationEvent(event.time, _this._getEventAction(context, sound, event.action, event.time, event.startOffset));
                                babylonAnimation.animation.addEvent(babylonAnimationEvent);
                                // Make sure all started audio stops when this animation is terminated.
                                babylonAnimationGroup.onAnimationGroupEndObservable.add(function () {
                                    sound.stop();
                                });
                                babylonAnimationGroup.onAnimationGroupPauseObservable.add(function () {
                                    sound.pause();
                                });
                            }
                        });
                    };
                    return MSFT_audio_emitter;
                }());
                Extensions.MSFT_audio_emitter = MSFT_audio_emitter;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new MSFT_audio_emitter(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=MSFT_audio_emitter.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_draco_mesh_compression";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression)
                 */
                var KHR_draco_mesh_compression = /** @class */ (function () {
                    /** @hidden */
                    function KHR_draco_mesh_compression(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = BABYLON.DracoCompression.DecoderAvailable;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_draco_mesh_compression.prototype.dispose = function () {
                        if (this._dracoCompression) {
                            this._dracoCompression.dispose();
                            delete this._dracoCompression;
                        }
                        delete this._loader;
                    };
                    /** @hidden */
                    KHR_draco_mesh_compression.prototype._loadVertexDataAsync = function (context, primitive, babylonMesh) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, primitive, this.name, function (extensionContext, extension) {
                            if (primitive.mode != undefined) {
                                if (primitive.mode !== 5 /* TRIANGLE_STRIP */ &&
                                    primitive.mode !== 4 /* TRIANGLES */) {
                                    throw new Error(context + ": Unsupported mode " + primitive.mode);
                                }
                                // TODO: handle triangle strips
                                if (primitive.mode === 5 /* TRIANGLE_STRIP */) {
                                    throw new Error(context + ": Mode " + primitive.mode + " is not currently supported");
                                }
                            }
                            var attributes = {};
                            var loadAttribute = function (name, kind) {
                                var uniqueId = extension.attributes[name];
                                if (uniqueId == undefined) {
                                    return;
                                }
                                babylonMesh._delayInfo = babylonMesh._delayInfo || [];
                                if (babylonMesh._delayInfo.indexOf(kind) === -1) {
                                    babylonMesh._delayInfo.push(kind);
                                }
                                attributes[kind] = uniqueId;
                            };
                            loadAttribute("POSITION", BABYLON.VertexBuffer.PositionKind);
                            loadAttribute("NORMAL", BABYLON.VertexBuffer.NormalKind);
                            loadAttribute("TANGENT", BABYLON.VertexBuffer.TangentKind);
                            loadAttribute("TEXCOORD_0", BABYLON.VertexBuffer.UVKind);
                            loadAttribute("TEXCOORD_1", BABYLON.VertexBuffer.UV2Kind);
                            loadAttribute("JOINTS_0", BABYLON.VertexBuffer.MatricesIndicesKind);
                            loadAttribute("WEIGHTS_0", BABYLON.VertexBuffer.MatricesWeightsKind);
                            loadAttribute("COLOR_0", BABYLON.VertexBuffer.ColorKind);
                            var bufferView = GLTF2.ArrayItem.Get(extensionContext, _this._loader.gltf.bufferViews, extension.bufferView);
                            if (!bufferView._dracoBabylonGeometry) {
                                bufferView._dracoBabylonGeometry = _this._loader.loadBufferViewAsync("#/bufferViews/" + bufferView.index, bufferView).then(function (data) {
                                    if (!_this._dracoCompression) {
                                        _this._dracoCompression = new BABYLON.DracoCompression();
                                    }
                                    return _this._dracoCompression.decodeMeshAsync(data, attributes).then(function (babylonVertexData) {
                                        var babylonGeometry = new BABYLON.Geometry(babylonMesh.name, _this._loader.babylonScene);
                                        babylonVertexData.applyToGeometry(babylonGeometry);
                                        return babylonGeometry;
                                    }).catch(function (error) {
                                        throw new Error(context + ": " + error.message);
                                    });
                                });
                            }
                            return bufferView._dracoBabylonGeometry;
                        });
                    };
                    return KHR_draco_mesh_compression;
                }());
                Extensions.KHR_draco_mesh_compression = KHR_draco_mesh_compression;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_draco_mesh_compression(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_draco_mesh_compression.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_materials_pbrSpecularGlossiness";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness)
                 */
                var KHR_materials_pbrSpecularGlossiness = /** @class */ (function () {
                    /** @hidden */
                    function KHR_materials_pbrSpecularGlossiness(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_materials_pbrSpecularGlossiness.prototype.dispose = function () {
                        delete this._loader;
                    };
                    /** @hidden */
                    KHR_materials_pbrSpecularGlossiness.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, material, this.name, function (extensionContext, extension) {
                            var promises = new Array();
                            promises.push(_this._loader.loadMaterialBasePropertiesAsync(context, material, babylonMaterial));
                            promises.push(_this._loadSpecularGlossinessPropertiesAsync(extensionContext, material, extension, babylonMaterial));
                            _this._loader.loadMaterialAlphaProperties(context, material, babylonMaterial);
                            return Promise.all(promises).then(function () { });
                        });
                    };
                    KHR_materials_pbrSpecularGlossiness.prototype._loadSpecularGlossinessPropertiesAsync = function (context, material, properties, babylonMaterial) {
                        if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                            throw new Error(context + ": Material type not supported");
                        }
                        var promises = new Array();
                        babylonMaterial.metallic = null;
                        babylonMaterial.roughness = null;
                        if (properties.diffuseFactor) {
                            babylonMaterial.albedoColor = BABYLON.Color3.FromArray(properties.diffuseFactor);
                            babylonMaterial.alpha = properties.diffuseFactor[3];
                        }
                        else {
                            babylonMaterial.albedoColor = BABYLON.Color3.White();
                        }
                        babylonMaterial.reflectivityColor = properties.specularFactor ? BABYLON.Color3.FromArray(properties.specularFactor) : BABYLON.Color3.White();
                        babylonMaterial.microSurface = properties.glossinessFactor == undefined ? 1 : properties.glossinessFactor;
                        if (properties.diffuseTexture) {
                            promises.push(this._loader.loadTextureInfoAsync(context + "/diffuseTexture", properties.diffuseTexture, function (texture) {
                                babylonMaterial.albedoTexture = texture;
                                return Promise.resolve();
                            }));
                        }
                        if (properties.specularGlossinessTexture) {
                            promises.push(this._loader.loadTextureInfoAsync(context + "/specularGlossinessTexture", properties.specularGlossinessTexture, function (texture) {
                                babylonMaterial.reflectivityTexture = texture;
                                return Promise.resolve();
                            }));
                            babylonMaterial.reflectivityTexture.hasAlpha = true;
                            babylonMaterial.useMicroSurfaceFromReflectivityMapAlpha = true;
                        }
                        return Promise.all(promises).then(function () { });
                    };
                    return KHR_materials_pbrSpecularGlossiness;
                }());
                Extensions.KHR_materials_pbrSpecularGlossiness = KHR_materials_pbrSpecularGlossiness;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_materials_pbrSpecularGlossiness(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_materials_pbrSpecularGlossiness.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_materials_unlit";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit)
                 */
                var KHR_materials_unlit = /** @class */ (function () {
                    /** @hidden */
                    function KHR_materials_unlit(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_materials_unlit.prototype.dispose = function () {
                        delete this._loader;
                    };
                    /** @hidden */
                    KHR_materials_unlit.prototype.loadMaterialPropertiesAsync = function (context, material, babylonMaterial) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, material, this.name, function () {
                            return _this._loadUnlitPropertiesAsync(context, material, babylonMaterial);
                        });
                    };
                    KHR_materials_unlit.prototype._loadUnlitPropertiesAsync = function (context, material, babylonMaterial) {
                        if (!(babylonMaterial instanceof BABYLON.PBRMaterial)) {
                            throw new Error(context + ": Material type not supported");
                        }
                        var promises = new Array();
                        babylonMaterial.unlit = true;
                        var properties = material.pbrMetallicRoughness;
                        if (properties) {
                            if (properties.baseColorFactor) {
                                babylonMaterial.albedoColor = BABYLON.Color3.FromArray(properties.baseColorFactor);
                                babylonMaterial.alpha = properties.baseColorFactor[3];
                            }
                            else {
                                babylonMaterial.albedoColor = BABYLON.Color3.White();
                            }
                            if (properties.baseColorTexture) {
                                promises.push(this._loader.loadTextureInfoAsync(context + "/baseColorTexture", properties.baseColorTexture, function (texture) {
                                    babylonMaterial.albedoTexture = texture;
                                    return Promise.resolve();
                                }));
                            }
                        }
                        if (material.doubleSided) {
                            babylonMaterial.backFaceCulling = false;
                            babylonMaterial.twoSidedLighting = true;
                        }
                        this._loader.loadMaterialAlphaProperties(context, material, babylonMaterial);
                        return Promise.all(promises).then(function () { });
                    };
                    return KHR_materials_unlit;
                }());
                Extensions.KHR_materials_unlit = KHR_materials_unlit;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_materials_unlit(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_materials_unlit.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_lights_punctual";
                var LightType;
                (function (LightType) {
                    LightType["DIRECTIONAL"] = "directional";
                    LightType["POINT"] = "point";
                    LightType["SPOT"] = "spot";
                })(LightType || (LightType = {}));
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/blob/1048d162a44dbcb05aefc1874bfd423cf60135a6/extensions/2.0/Khronos/KHR_lights_punctual/README.md) (Experimental)
                 */
                var KHR_lights = /** @class */ (function () {
                    /** @hidden */
                    function KHR_lights(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_lights.prototype.dispose = function () {
                        delete this._loader;
                        delete this._lights;
                    };
                    /** @hidden */
                    KHR_lights.prototype.onLoading = function () {
                        var extensions = this._loader.gltf.extensions;
                        if (extensions && extensions[this.name]) {
                            var extension = extensions[this.name];
                            this._lights = extension.lights;
                        }
                    };
                    /** @hidden */
                    KHR_lights.prototype.loadNodeAsync = function (context, node, assign) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, node, this.name, function (extensionContext, extension) {
                            return _this._loader.loadNodeAsync(context, node, function (babylonMesh) {
                                var babylonLight;
                                var light = GLTF2.ArrayItem.Get(extensionContext, _this._lights, extension.light);
                                var name = light.name || babylonMesh.name;
                                switch (light.type) {
                                    case LightType.DIRECTIONAL: {
                                        babylonLight = new BABYLON.DirectionalLight(name, BABYLON.Vector3.Backward(), _this._loader.babylonScene);
                                        break;
                                    }
                                    case LightType.POINT: {
                                        babylonLight = new BABYLON.PointLight(name, BABYLON.Vector3.Zero(), _this._loader.babylonScene);
                                        break;
                                    }
                                    case LightType.SPOT: {
                                        var babylonSpotLight = new BABYLON.SpotLight(name, BABYLON.Vector3.Zero(), BABYLON.Vector3.Backward(), 0, 1, _this._loader.babylonScene);
                                        babylonSpotLight.angle = ((light.spot && light.spot.outerConeAngle) || Math.PI / 4) * 2;
                                        babylonSpotLight.innerAngle = ((light.spot && light.spot.innerConeAngle) || 0) * 2;
                                        babylonLight = babylonSpotLight;
                                        break;
                                    }
                                    default: {
                                        throw new Error(extensionContext + ": Invalid light type (" + light.type + ")");
                                    }
                                }
                                babylonLight.falloffType = BABYLON.Light.FALLOFF_GLTF;
                                babylonLight.diffuse = light.color ? BABYLON.Color3.FromArray(light.color) : BABYLON.Color3.White();
                                babylonLight.intensity = light.intensity == undefined ? 1 : light.intensity;
                                babylonLight.range = light.range == undefined ? Number.MAX_VALUE : light.range;
                                babylonLight.parent = babylonMesh;
                                assign(babylonMesh);
                            });
                        });
                    };
                    return KHR_lights;
                }());
                Extensions.KHR_lights = KHR_lights;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_lights(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_lights_punctual.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "KHR_texture_transform";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_transform/README.md)
                 */
                var KHR_texture_transform = /** @class */ (function () {
                    /** @hidden */
                    function KHR_texture_transform(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    KHR_texture_transform.prototype.dispose = function () {
                        delete this._loader;
                    };
                    /** @hidden */
                    KHR_texture_transform.prototype.loadTextureInfoAsync = function (context, textureInfo, assign) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, textureInfo, this.name, function (extensionContext, extension) {
                            return _this._loader.loadTextureInfoAsync(context, textureInfo, function (babylonTexture) {
                                if (!(babylonTexture instanceof BABYLON.Texture)) {
                                    throw new Error(extensionContext + ": Texture type not supported");
                                }
                                if (extension.offset) {
                                    babylonTexture.uOffset = extension.offset[0];
                                    babylonTexture.vOffset = extension.offset[1];
                                }
                                // Always rotate around the origin.
                                babylonTexture.uRotationCenter = 0;
                                babylonTexture.vRotationCenter = 0;
                                if (extension.rotation) {
                                    babylonTexture.wAng = -extension.rotation;
                                }
                                if (extension.scale) {
                                    babylonTexture.uScale = extension.scale[0];
                                    babylonTexture.vScale = extension.scale[1];
                                }
                                if (extension.texCoord != undefined) {
                                    babylonTexture.coordinatesIndex = extension.texCoord;
                                }
                                assign(babylonTexture);
                            });
                        });
                    };
                    return KHR_texture_transform;
                }());
                Extensions.KHR_texture_transform = KHR_texture_transform;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new KHR_texture_transform(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=KHR_texture_transform.js.map

/// <reference path="../../../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var GLTF2;
    (function (GLTF2) {
        var Loader;
        (function (Loader) {
            var Extensions;
            (function (Extensions) {
                var NAME = "EXT_lights_image_based";
                /**
                 * [Specification](https://github.com/KhronosGroup/glTF/blob/eb3e32332042e04691a5f35103f8c261e50d8f1e/extensions/2.0/Khronos/EXT_lights_image_based/README.md) (Experimental)
                 */
                var EXT_lights_image_based = /** @class */ (function () {
                    /** @hidden */
                    function EXT_lights_image_based(loader) {
                        /** The name of this extension. */
                        this.name = NAME;
                        /** Defines whether this extension is enabled. */
                        this.enabled = true;
                        this._loader = loader;
                    }
                    /** @hidden */
                    EXT_lights_image_based.prototype.dispose = function () {
                        delete this._loader;
                        delete this._lights;
                    };
                    /** @hidden */
                    EXT_lights_image_based.prototype.onLoading = function () {
                        var extensions = this._loader.gltf.extensions;
                        if (extensions && extensions[this.name]) {
                            var extension = extensions[this.name];
                            this._lights = extension.lights;
                        }
                    };
                    /** @hidden */
                    EXT_lights_image_based.prototype.loadSceneAsync = function (context, scene) {
                        var _this = this;
                        return GLTF2.GLTFLoader.LoadExtensionAsync(context, scene, this.name, function (extensionContext, extension) {
                            var promises = new Array();
                            promises.push(_this._loader.loadSceneAsync(context, scene));
                            _this._loader.logOpen("" + extensionContext);
                            var light = GLTF2.ArrayItem.Get(extensionContext + "/light", _this._lights, extension.light);
                            promises.push(_this._loadLightAsync("#/extensions/" + _this.name + "/lights/" + extension.light, light).then(function (texture) {
                                _this._loader.babylonScene.environmentTexture = texture;
                            }));
                            _this._loader.logClose();
                            return Promise.all(promises).then(function () { });
                        });
                    };
                    EXT_lights_image_based.prototype._loadLightAsync = function (context, light) {
                        var _this = this;
                        if (!light._loaded) {
                            var promises = new Array();
                            this._loader.logOpen("" + context);
                            var imageData_1 = new Array(light.specularImages.length);
                            var _loop_1 = function (mipmap) {
                                var faces = light.specularImages[mipmap];
                                imageData_1[mipmap] = new Array(faces.length);
                                var _loop_2 = function (face) {
                                    var specularImageContext = context + "/specularImages/" + mipmap + "/" + face;
                                    this_1._loader.logOpen("" + specularImageContext);
                                    var index = faces[face];
                                    var image = GLTF2.ArrayItem.Get(specularImageContext, this_1._loader.gltf.images, index);
                                    promises.push(this_1._loader.loadImageAsync("#/images/" + index, image).then(function (data) {
                                        imageData_1[mipmap][face] = data;
                                    }));
                                    this_1._loader.logClose();
                                };
                                for (var face = 0; face < faces.length; face++) {
                                    _loop_2(face);
                                }
                            };
                            var this_1 = this;
                            for (var mipmap = 0; mipmap < light.specularImages.length; mipmap++) {
                                _loop_1(mipmap);
                            }
                            this._loader.logClose();
                            light._loaded = Promise.all(promises).then(function () {
                                var babylonTexture = new BABYLON.RawCubeTexture(_this._loader.babylonScene, null, light.specularImageSize);
                                light._babylonTexture = babylonTexture;
                                if (light.intensity != undefined) {
                                    babylonTexture.level = light.intensity;
                                }
                                if (light.rotation) {
                                    var rotation = BABYLON.Quaternion.FromArray(light.rotation);
                                    // Invert the rotation so that positive rotation is counter-clockwise.
                                    if (!_this._loader.babylonScene.useRightHandedSystem) {
                                        rotation = BABYLON.Quaternion.Inverse(rotation);
                                    }
                                    BABYLON.Matrix.FromQuaternionToRef(rotation, babylonTexture.getReflectionTextureMatrix());
                                }
                                var sphericalHarmonics = BABYLON.SphericalHarmonics.FromArray(light.irradianceCoefficients);
                                sphericalHarmonics.scale(light.intensity);
                                sphericalHarmonics.convertIrradianceToLambertianRadiance();
                                var sphericalPolynomial = BABYLON.SphericalPolynomial.FromHarmonics(sphericalHarmonics);
                                // Compute the lod generation scale to fit exactly to the number of levels available.
                                var lodGenerationScale = (imageData_1.length - 1) / BABYLON.Scalar.Log2(light.specularImageSize);
                                return babylonTexture.updateRGBDAsync(imageData_1, sphericalPolynomial, lodGenerationScale);
                            });
                        }
                        return light._loaded.then(function () {
                            return light._babylonTexture;
                        });
                    };
                    return EXT_lights_image_based;
                }());
                Extensions.EXT_lights_image_based = EXT_lights_image_based;
                GLTF2.GLTFLoader.RegisterExtension(NAME, function (loader) { return new EXT_lights_image_based(loader); });
            })(Extensions = Loader.Extensions || (Loader.Extensions = {}));
        })(Loader = GLTF2.Loader || (GLTF2.Loader = {}));
    })(GLTF2 = BABYLON.GLTF2 || (BABYLON.GLTF2 = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=EXT_lights_image_based.js.map


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    var STLFileLoader = /** @class */ (function () {
        function STLFileLoader() {
            this.solidPattern = /solid (\S*)([\S\s]*)endsolid[ ]*(\S*)/g;
            this.facetsPattern = /facet([\s\S]*?)endfacet/g;
            this.normalPattern = /normal[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;
            this.vertexPattern = /vertex[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;
            this.name = "stl";
            // force data to come in as an ArrayBuffer
            // we'll convert to string if it looks like it's an ASCII .stl
            this.extensions = {
                ".stl": { isBinary: true },
            };
        }
        STLFileLoader.prototype.importMesh = function (meshesNames, scene, data, rootUrl, meshes, particleSystems, skeletons) {
            var matches;
            if (typeof data !== "string") {
                if (this.isBinary(data)) {
                    // binary .stl
                    var babylonMesh = new BABYLON.Mesh("stlmesh", scene);
                    this.parseBinary(babylonMesh, data);
                    if (meshes) {
                        meshes.push(babylonMesh);
                    }
                    return true;
                }
                // ASCII .stl
                // convert to string
                var array_buffer = new Uint8Array(data);
                var str = '';
                for (var i = 0; i < data.byteLength; i++) {
                    str += String.fromCharCode(array_buffer[i]); // implicitly assumes little-endian
                }
                data = str;
            }
            //if arrived here, data is a string, containing the STLA data.
            while (matches = this.solidPattern.exec(data)) {
                var meshName = matches[1];
                var meshNameFromEnd = matches[3];
                if (meshName != meshNameFromEnd) {
                    BABYLON.Tools.Error("Error in STL, solid name != endsolid name");
                    return false;
                }
                // check meshesNames
                if (meshesNames && meshName) {
                    if (meshesNames instanceof Array) {
                        if (!meshesNames.indexOf(meshName)) {
                            continue;
                        }
                    }
                    else {
                        if (meshName !== meshesNames) {
                            continue;
                        }
                    }
                }
                // stl mesh name can be empty as well
                meshName = meshName || "stlmesh";
                var babylonMesh = new BABYLON.Mesh(meshName, scene);
                this.parseASCII(babylonMesh, matches[2]);
                if (meshes) {
                    meshes.push(babylonMesh);
                }
            }
            return true;
        };
        STLFileLoader.prototype.load = function (scene, data, rootUrl) {
            var result = this.importMesh(null, scene, data, rootUrl, null, null, null);
            if (result) {
                scene.createDefaultCameraOrLight();
            }
            return result;
        };
        STLFileLoader.prototype.loadAssetContainer = function (scene, data, rootUrl, onError) {
            var container = new BABYLON.AssetContainer(scene);
            this.importMesh(null, scene, data, rootUrl, container.meshes, null, null);
            container.removeAllFromScene();
            return container;
        };
        STLFileLoader.prototype.isBinary = function (data) {
            // check if file size is correct for binary stl
            var faceSize, nFaces, reader;
            reader = new DataView(data);
            faceSize = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
            nFaces = reader.getUint32(80, true);
            if (80 + (32 / 8) + (nFaces * faceSize) === reader.byteLength) {
                return true;
            }
            // check characters higher than ASCII to confirm binary
            var fileLength = reader.byteLength;
            for (var index = 0; index < fileLength; index++) {
                if (reader.getUint8(index) > 127) {
                    return true;
                }
            }
            return false;
        };
        STLFileLoader.prototype.parseBinary = function (mesh, data) {
            var reader = new DataView(data);
            var faces = reader.getUint32(80, true);
            var dataOffset = 84;
            var faceLength = 12 * 4 + 2;
            var offset = 0;
            var positions = new Float32Array(faces * 3 * 3);
            var normals = new Float32Array(faces * 3 * 3);
            var indices = new Uint32Array(faces * 3);
            var indicesCount = 0;
            for (var face = 0; face < faces; face++) {
                var start = dataOffset + face * faceLength;
                var normalX = reader.getFloat32(start, true);
                var normalY = reader.getFloat32(start + 4, true);
                var normalZ = reader.getFloat32(start + 8, true);
                for (var i = 1; i <= 3; i++) {
                    var vertexstart = start + i * 12;
                    // ordering is intentional to match ascii import
                    positions[offset] = reader.getFloat32(vertexstart, true);
                    positions[offset + 2] = reader.getFloat32(vertexstart + 4, true);
                    positions[offset + 1] = reader.getFloat32(vertexstart + 8, true);
                    normals[offset] = normalX;
                    normals[offset + 2] = normalY;
                    normals[offset + 1] = normalZ;
                    offset += 3;
                }
                indices[indicesCount] = indicesCount++;
                indices[indicesCount] = indicesCount++;
                indices[indicesCount] = indicesCount++;
            }
            mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
            mesh.setIndices(indices);
            mesh.computeWorldMatrix(true);
        };
        STLFileLoader.prototype.parseASCII = function (mesh, solidData) {
            var positions = [];
            var normals = [];
            var indices = [];
            var indicesCount = 0;
            //load facets, ignoring loop as the standard doesn't define it can contain more than vertices
            var matches;
            while (matches = this.facetsPattern.exec(solidData)) {
                var facet = matches[1];
                //one normal per face
                var normalMatches = this.normalPattern.exec(facet);
                this.normalPattern.lastIndex = 0;
                if (!normalMatches) {
                    continue;
                }
                var normal = [Number(normalMatches[1]), Number(normalMatches[5]), Number(normalMatches[3])];
                var vertexMatch;
                while (vertexMatch = this.vertexPattern.exec(facet)) {
                    positions.push(Number(vertexMatch[1]), Number(vertexMatch[5]), Number(vertexMatch[3]));
                    normals.push(normal[0], normal[1], normal[2]);
                }
                indices.push(indicesCount++, indicesCount++, indicesCount++);
                this.vertexPattern.lastIndex = 0;
            }
            this.facetsPattern.lastIndex = 0;
            mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
            mesh.setIndices(indices);
            mesh.computeWorldMatrix(true);
        };
        return STLFileLoader;
    }());
    BABYLON.STLFileLoader = STLFileLoader;
    if (BABYLON.SceneLoader) {
        BABYLON.SceneLoader.RegisterPlugin(new STLFileLoader());
    }
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.stlFileLoader.js.map


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var BABYLON;
(function (BABYLON) {
    /**
     * Class reading and parsing the MTL file bundled with the obj file.
     */
    var MTLFileLoader = /** @class */ (function () {
        function MTLFileLoader() {
            // All material loaded from the mtl will be set here
            this.materials = [];
        }
        /**
         * This function will read the mtl file and create each material described inside
         * This function could be improve by adding :
         * -some component missing (Ni, Tf...)
         * -including the specific options available
         *
         * @param scene
         * @param data
         * @param rootUrl
         */
        MTLFileLoader.prototype.parseMTL = function (scene, data, rootUrl) {
            if (data instanceof ArrayBuffer) {
                return;
            }
            //Split the lines from the file
            var lines = data.split('\n');
            //Space char
            var delimiter_pattern = /\s+/;
            //Array with RGB colors
            var color;
            //New material
            var material = null;
            //Look at each line
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                // Blank line or comment
                if (line.length === 0 || line.charAt(0) === '#') {
                    continue;
                }
                //Get the first parameter (keyword)
                var pos = line.indexOf(' ');
                var key = (pos >= 0) ? line.substring(0, pos) : line;
                key = key.toLowerCase();
                //Get the data following the key
                var value = (pos >= 0) ? line.substring(pos + 1).trim() : "";
                //This mtl keyword will create the new material
                if (key === "newmtl") {
                    //Check if it is the first material.
                    // Materials specifications are described after this keyword.
                    if (material) {
                        //Add the previous material in the material array.
                        this.materials.push(material);
                    }
                    //Create a new material.
                    // value is the name of the material read in the mtl file
                    material = new BABYLON.StandardMaterial(value, scene);
                }
                else if (key === "kd" && material) {
                    // Diffuse color (color under white light) using RGB values
                    //value  = "r g b"
                    color = value.split(delimiter_pattern, 3).map(parseFloat);
                    //color = [r,g,b]
                    //Set tghe color into the material
                    material.diffuseColor = BABYLON.Color3.FromArray(color);
                }
                else if (key === "ka" && material) {
                    // Ambient color (color under shadow) using RGB values
                    //value = "r g b"
                    color = value.split(delimiter_pattern, 3).map(parseFloat);
                    //color = [r,g,b]
                    //Set tghe color into the material
                    material.ambientColor = BABYLON.Color3.FromArray(color);
                }
                else if (key === "ks" && material) {
                    // Specular color (color when light is reflected from shiny surface) using RGB values
                    //value = "r g b"
                    color = value.split(delimiter_pattern, 3).map(parseFloat);
                    //color = [r,g,b]
                    //Set the color into the material
                    material.specularColor = BABYLON.Color3.FromArray(color);
                }
                else if (key === "ke" && material) {
                    // Emissive color using RGB values
                    color = value.split(delimiter_pattern, 3).map(parseFloat);
                    material.emissiveColor = BABYLON.Color3.FromArray(color);
                }
                else if (key === "ns" && material) {
                    //value = "Integer"
                    material.specularPower = parseFloat(value);
                }
                else if (key === "d" && material) {
                    //d is dissolve for current material. It mean alpha for BABYLON
                    material.alpha = parseFloat(value);
                    //Texture
                    //This part can be improved by adding the possible options of texture
                }
                else if (key === "map_ka" && material) {
                    // ambient texture map with a loaded image
                    //We must first get the folder of the image
                    material.ambientTexture = MTLFileLoader._getTexture(rootUrl, value, scene);
                }
                else if (key === "map_kd" && material) {
                    // Diffuse texture map with a loaded image
                    material.diffuseTexture = MTLFileLoader._getTexture(rootUrl, value, scene);
                }
                else if (key === "map_ks" && material) {
                    // Specular texture map with a loaded image
                    //We must first get the folder of the image
                    material.specularTexture = MTLFileLoader._getTexture(rootUrl, value, scene);
                }
                else if (key === "map_ns") {
                    //Specular
                    //Specular highlight component
                    //We must first get the folder of the image
                    //
                    //Not supported by BABYLON
                    //
                    //    continue;
                }
                else if (key === "map_bump" && material) {
                    //The bump texture
                    material.bumpTexture = MTLFileLoader._getTexture(rootUrl, value, scene);
                }
                else if (key === "map_d" && material) {
                    // The dissolve of the material
                    material.opacityTexture = MTLFileLoader._getTexture(rootUrl, value, scene);
                    //Options for illumination
                }
                else if (key === "illum") {
                    //Illumination
                    if (value === "0") {
                        //That mean Kd == Kd
                    }
                    else if (value === "1") {
                        //Color on and Ambient on
                    }
                    else if (value === "2") {
                        //Highlight on
                    }
                    else if (value === "3") {
                        //Reflection on and Ray trace on
                    }
                    else if (value === "4") {
                        //Transparency: Glass on, Reflection: Ray trace on
                    }
                    else if (value === "5") {
                        //Reflection: Fresnel on and Ray trace on
                    }
                    else if (value === "6") {
                        //Transparency: Refraction on, Reflection: Fresnel off and Ray trace on
                    }
                    else if (value === "7") {
                        //Transparency: Refraction on, Reflection: Fresnel on and Ray trace on
                    }
                    else if (value === "8") {
                        //Reflection on and Ray trace off
                    }
                    else if (value === "9") {
                        //Transparency: Glass on, Reflection: Ray trace off
                    }
                    else if (value === "10") {
                        //Casts shadows onto invisible surfaces
                    }
                }
                else {
                    // console.log("Unhandled expression at line : " + i +'\n' + "with value : " + line);
                }
            }
            //At the end of the file, add the last material
            if (material) {
                this.materials.push(material);
            }
        };
        /**
         * Gets the texture for the material.
         *
         * If the material is imported from input file,
         * We sanitize the url to ensure it takes the textre from aside the material.
         *
         * @param rootUrl The root url to load from
         * @param value The value stored in the mtl
         * @return The Texture
         */
        MTLFileLoader._getTexture = function (rootUrl, value, scene) {
            if (!value) {
                return null;
            }
            var url = rootUrl;
            // Load from input file.
            if (rootUrl === "file:") {
                var lastDelimiter = value.lastIndexOf("\\");
                if (lastDelimiter === -1) {
                    lastDelimiter = value.lastIndexOf("/");
                }
                if (lastDelimiter > -1) {
                    url += value.substr(lastDelimiter + 1);
                }
                else {
                    url += value;
                }
            }
            // Not from input file.
            else {
                url += value;
            }
            return new BABYLON.Texture(url, scene);
        };
        return MTLFileLoader;
    }());
    BABYLON.MTLFileLoader = MTLFileLoader;
    var OBJFileLoader = /** @class */ (function () {
        function OBJFileLoader() {
            this.name = "obj";
            this.extensions = ".obj";
            this.obj = /^o/;
            this.group = /^g/;
            this.mtllib = /^mtllib /;
            this.usemtl = /^usemtl /;
            this.smooth = /^s /;
            this.vertexPattern = /v( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;
            // vn float float float
            this.normalPattern = /vn( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;
            // vt float float
            this.uvPattern = /vt( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;
            // f vertex vertex vertex ...
            this.facePattern1 = /f\s+(([\d]{1,}[\s]?){3,})+/;
            // f vertex/uvs vertex/uvs vertex/uvs ...
            this.facePattern2 = /f\s+((([\d]{1,}\/[\d]{1,}[\s]?){3,})+)/;
            // f vertex/uvs/normal vertex/uvs/normal vertex/uvs/normal ...
            this.facePattern3 = /f\s+((([\d]{1,}\/[\d]{1,}\/[\d]{1,}[\s]?){3,})+)/;
            // f vertex//normal vertex//normal vertex//normal ...
            this.facePattern4 = /f\s+((([\d]{1,}\/\/[\d]{1,}[\s]?){3,})+)/;
            // f -vertex/-uvs/-normal -vertex/-uvs/-normal -vertex/-uvs/-normal ...
            this.facePattern5 = /f\s+(((-[\d]{1,}\/-[\d]{1,}\/-[\d]{1,}[\s]?){3,})+)/;
        }
        /**
         * Calls synchronously the MTL file attached to this obj.
         * Load function or importMesh function don't enable to load 2 files in the same time asynchronously.
         * Without this function materials are not displayed in the first frame (but displayed after).
         * In consequence it is impossible to get material information in your HTML file
         *
         * @param url The URL of the MTL file
         * @param rootUrl
         * @param onSuccess Callback function to be called when the MTL file is loaded
         * @private
         */
        OBJFileLoader.prototype._loadMTL = function (url, rootUrl, onSuccess) {
            //The complete path to the mtl file
            var pathOfFile = BABYLON.Tools.BaseUrl + rootUrl + url;
            // Loads through the babylon tools to allow fileInput search.
            BABYLON.Tools.LoadFile(pathOfFile, onSuccess, undefined, undefined, false, function () { console.warn("Error - Unable to load " + pathOfFile); });
        };
        /**
         * Imports one or more meshes from the loaded glTF data and adds them to the scene
         * @param meshesNames a string or array of strings of the mesh names that should be loaded from the file
         * @param scene the scene the meshes should be added to
         * @param data the glTF data to load
         * @param rootUrl root url to load from
         * @param onProgress event that fires when loading progress has occured
         * @param fileName Defines the name of the file to load
         * @returns a promise containg the loaded meshes, particles, skeletons and animations
         */
        OBJFileLoader.prototype.importMeshAsync = function (meshesNames, scene, data, rootUrl, onProgress, fileName) {
            //get the meshes from OBJ file
            return this._parseSolid(meshesNames, scene, data, rootUrl).then(function (meshes) {
                return {
                    meshes: meshes,
                    particleSystems: [],
                    skeletons: [],
                    animationGroups: []
                };
            });
        };
        /**
         * Imports all objects from the loaded glTF data and adds them to the scene
         * @param scene the scene the objects should be added to
         * @param data the glTF data to load
         * @param rootUrl root url to load from
         * @param onProgress event that fires when loading progress has occured
         * @param fileName Defines the name of the file to load
         * @returns a promise which completes when objects have been loaded to the scene
         */
        OBJFileLoader.prototype.loadAsync = function (scene, data, rootUrl, onProgress, fileName) {
            //Get the 3D model
            return this.importMeshAsync(null, scene, data, rootUrl, onProgress).then(function () {
                // return void
            });
        };
        /**
         * Load into an asset container.
         * @param scene The scene to load into
         * @param data The data to import
         * @param rootUrl The root url for scene and resources
         * @param onProgress The callback when the load progresses
         * @param fileName Defines the name of the file to load
         * @returns The loaded asset container
         */
        OBJFileLoader.prototype.loadAssetContainerAsync = function (scene, data, rootUrl, onProgress, fileName) {
            return this.importMeshAsync(null, scene, data, rootUrl).then(function (result) {
                var container = new BABYLON.AssetContainer(scene);
                result.meshes.forEach(function (mesh) { return container.meshes.push(mesh); });
                container.removeAllFromScene();
                return container;
            });
        };
        /**
         * Read the OBJ file and create an Array of meshes.
         * Each mesh contains all information given by the OBJ and the MTL file.
         * i.e. vertices positions and indices, optional normals values, optional UV values, optional material
         *
         * @param meshesNames
         * @param scene BABYLON.Scene The scene where are displayed the data
         * @param data String The content of the obj file
         * @param rootUrl String The path to the folder
         * @returns Array<AbstractMesh>
         * @private
         */
        OBJFileLoader.prototype._parseSolid = function (meshesNames, scene, data, rootUrl) {
            var _this = this;
            var positions = []; //values for the positions of vertices
            var normals = []; //Values for the normals
            var uvs = []; //Values for the textures
            var meshesFromObj = []; //[mesh] Contains all the obj meshes
            var handledMesh; //The current mesh of meshes array
            var indicesForBabylon = []; //The list of indices for VertexData
            var wrappedPositionForBabylon = []; //The list of position in vectors
            var wrappedUvsForBabylon = []; //Array with all value of uvs to match with the indices
            var wrappedNormalsForBabylon = []; //Array with all value of normals to match with the indices
            var tuplePosNorm = []; //Create a tuple with indice of Position, Normal, UV  [pos, norm, uvs]
            var curPositionInIndices = 0;
            var hasMeshes = false; //Meshes are defined in the file
            var unwrappedPositionsForBabylon = []; //Value of positionForBabylon w/o Vector3() [x,y,z]
            var unwrappedNormalsForBabylon = []; //Value of normalsForBabylon w/o Vector3()  [x,y,z]
            var unwrappedUVForBabylon = []; //Value of uvsForBabylon w/o Vector3()      [x,y,z]
            var triangles = []; //Indices from new triangles coming from polygons
            var materialNameFromObj = ""; //The name of the current material
            var fileToLoad = ""; //The name of the mtlFile to load
            var materialsFromMTLFile = new MTLFileLoader();
            var objMeshName = ""; //The name of the current obj mesh
            var increment = 1; //Id for meshes created by the multimaterial
            var isFirstMaterial = true;
            /**
             * Search for obj in the given array.
             * This function is called to check if a couple of data already exists in an array.
             *
             * If found, returns the index of the founded tuple index. Returns -1 if not found
             * @param arr Array<{ normals: Array<number>, idx: Array<number> }>
             * @param obj Array<number>
             * @returns {boolean}
             */
            var isInArray = function (arr, obj) {
                if (!arr[obj[0]]) {
                    arr[obj[0]] = { normals: [], idx: [] };
                }
                var idx = arr[obj[0]].normals.indexOf(obj[1]);
                return idx === -1 ? -1 : arr[obj[0]].idx[idx];
            };
            var isInArrayUV = function (arr, obj) {
                if (!arr[obj[0]]) {
                    arr[obj[0]] = { normals: [], idx: [], uv: [] };
                }
                var idx = arr[obj[0]].normals.indexOf(obj[1]);
                if (idx != 1 && (obj[2] == arr[obj[0]].uv[idx])) {
                    return arr[obj[0]].idx[idx];
                }
                return -1;
            };
            /**
             * This function set the data for each triangle.
             * Data are position, normals and uvs
             * If a tuple of (position, normal) is not set, add the data into the corresponding array
             * If the tuple already exist, add only their indice
             *
             * @param indicePositionFromObj Integer The index in positions array
             * @param indiceUvsFromObj Integer The index in uvs array
             * @param indiceNormalFromObj Integer The index in normals array
             * @param positionVectorFromOBJ Vector3 The value of position at index objIndice
             * @param textureVectorFromOBJ Vector3 The value of uvs
             * @param normalsVectorFromOBJ Vector3 The value of normals at index objNormale
             */
            var setData = function (indicePositionFromObj, indiceUvsFromObj, indiceNormalFromObj, positionVectorFromOBJ, textureVectorFromOBJ, normalsVectorFromOBJ) {
                //Check if this tuple already exists in the list of tuples
                var _index;
                if (OBJFileLoader.OPTIMIZE_WITH_UV) {
                    _index = isInArrayUV(tuplePosNorm, [
                        indicePositionFromObj,
                        indiceNormalFromObj,
                        indiceUvsFromObj
                    ]);
                }
                else {
                    _index = isInArray(tuplePosNorm, [
                        indicePositionFromObj,
                        indiceNormalFromObj
                    ]);
                }
                //If it not exists
                if (_index == -1) {
                    //Add an new indice.
                    //The array of indices is only an array with his length equal to the number of triangles - 1.
                    //We add vertices data in this order
                    indicesForBabylon.push(wrappedPositionForBabylon.length);
                    //Push the position of vertice for Babylon
                    //Each element is a BABYLON.Vector3(x,y,z)
                    wrappedPositionForBabylon.push(positionVectorFromOBJ);
                    //Push the uvs for Babylon
                    //Each element is a BABYLON.Vector3(u,v)
                    wrappedUvsForBabylon.push(textureVectorFromOBJ);
                    //Push the normals for Babylon
                    //Each element is a BABYLON.Vector3(x,y,z)
                    wrappedNormalsForBabylon.push(normalsVectorFromOBJ);
                    //Add the tuple in the comparison list
                    tuplePosNorm[indicePositionFromObj].normals.push(indiceNormalFromObj);
                    tuplePosNorm[indicePositionFromObj].idx.push(curPositionInIndices++);
                    if (OBJFileLoader.OPTIMIZE_WITH_UV) {
                        tuplePosNorm[indicePositionFromObj].uv.push(indiceUvsFromObj);
                    }
                }
                else {
                    //The tuple already exists
                    //Add the index of the already existing tuple
                    //At this index we can get the value of position, normal and uvs of vertex
                    indicesForBabylon.push(_index);
                }
            };
            /**
             * Transform BABYLON.Vector() object onto 3 digits in an array
             */
            var unwrapData = function () {
                //Every array has the same length
                for (var l = 0; l < wrappedPositionForBabylon.length; l++) {
                    //Push the x, y, z values of each element in the unwrapped array
                    unwrappedPositionsForBabylon.push(wrappedPositionForBabylon[l].x, wrappedPositionForBabylon[l].y, wrappedPositionForBabylon[l].z);
                    unwrappedNormalsForBabylon.push(wrappedNormalsForBabylon[l].x, wrappedNormalsForBabylon[l].y, wrappedNormalsForBabylon[l].z);
                    unwrappedUVForBabylon.push(wrappedUvsForBabylon[l].x, wrappedUvsForBabylon[l].y); //z is an optional value not supported by BABYLON
                }
                // Reset arrays for the next new meshes
                wrappedPositionForBabylon = [];
                wrappedNormalsForBabylon = [];
                wrappedUvsForBabylon = [];
                tuplePosNorm = [];
                curPositionInIndices = 0;
            };
            /**
             * Create triangles from polygons by recursion
             * The best to understand how it works is to draw it in the same time you get the recursion.
             * It is important to notice that a triangle is a polygon
             * We get 5 patterns of face defined in OBJ File :
             * facePattern1 = ["1","2","3","4","5","6"]
             * facePattern2 = ["1/1","2/2","3/3","4/4","5/5","6/6"]
             * facePattern3 = ["1/1/1","2/2/2","3/3/3","4/4/4","5/5/5","6/6/6"]
             * facePattern4 = ["1//1","2//2","3//3","4//4","5//5","6//6"]
             * facePattern5 = ["-1/-1/-1","-2/-2/-2","-3/-3/-3","-4/-4/-4","-5/-5/-5","-6/-6/-6"]
             * Each pattern is divided by the same method
             * @param face Array[String] The indices of elements
             * @param v Integer The variable to increment
             */
            var getTriangles = function (face, v) {
                //Work for each element of the array
                if (v + 1 < face.length) {
                    //Add on the triangle variable the indexes to obtain triangles
                    triangles.push(face[0], face[v], face[v + 1]);
                    //Incrementation for recursion
                    v += 1;
                    //Recursion
                    getTriangles(face, v);
                }
                //Result obtained after 2 iterations:
                //Pattern1 => triangle = ["1","2","3","1","3","4"];
                //Pattern2 => triangle = ["1/1","2/2","3/3","1/1","3/3","4/4"];
                //Pattern3 => triangle = ["1/1/1","2/2/2","3/3/3","1/1/1","3/3/3","4/4/4"];
                //Pattern4 => triangle = ["1//1","2//2","3//3","1//1","3//3","4//4"];
                //Pattern5 => triangle = ["-1/-1/-1","-2/-2/-2","-3/-3/-3","-1/-1/-1","-3/-3/-3","-4/-4/-4"];
            };
            /**
             * Create triangles and push the data for each polygon for the pattern 1
             * In this pattern we get vertice positions
             * @param face
             * @param v
             */
            var setDataForCurrentFaceWithPattern1 = function (face, v) {
                //Get the indices of triangles for each polygon
                getTriangles(face, v);
                //For each element in the triangles array.
                //This var could contains 1 to an infinity of triangles
                for (var k = 0; k < triangles.length; k++) {
                    // Set position indice
                    var indicePositionFromObj = parseInt(triangles[k]) - 1;
                    setData(indicePositionFromObj, 0, 0, //In the pattern 1, normals and uvs are not defined
                    positions[indicePositionFromObj], //Get the vectors data
                    BABYLON.Vector2.Zero(), BABYLON.Vector3.Up() //Create default vectors
                    );
                }
                //Reset variable for the next line
                triangles = [];
            };
            /**
             * Create triangles and push the data for each polygon for the pattern 2
             * In this pattern we get vertice positions and uvsu
             * @param face
             * @param v
             */
            var setDataForCurrentFaceWithPattern2 = function (face, v) {
                //Get the indices of triangles for each polygon
                getTriangles(face, v);
                for (var k = 0; k < triangles.length; k++) {
                    //triangle[k] = "1/1"
                    //Split the data for getting position and uv
                    var point = triangles[k].split("/"); // ["1", "1"]
                    //Set position indice
                    var indicePositionFromObj = parseInt(point[0]) - 1;
                    //Set uv indice
                    var indiceUvsFromObj = parseInt(point[1]) - 1;
                    setData(indicePositionFromObj, indiceUvsFromObj, 0, //Default value for normals
                    positions[indicePositionFromObj], //Get the values for each element
                    uvs[indiceUvsFromObj], BABYLON.Vector3.Up() //Default value for normals
                    );
                }
                //Reset variable for the next line
                triangles = [];
            };
            /**
             * Create triangles and push the data for each polygon for the pattern 3
             * In this pattern we get vertice positions, uvs and normals
             * @param face
             * @param v
             */
            var setDataForCurrentFaceWithPattern3 = function (face, v) {
                //Get the indices of triangles for each polygon
                getTriangles(face, v);
                for (var k = 0; k < triangles.length; k++) {
                    //triangle[k] = "1/1/1"
                    //Split the data for getting position, uv, and normals
                    var point = triangles[k].split("/"); // ["1", "1", "1"]
                    // Set position indice
                    var indicePositionFromObj = parseInt(point[0]) - 1;
                    // Set uv indice
                    var indiceUvsFromObj = parseInt(point[1]) - 1;
                    // Set normal indice
                    var indiceNormalFromObj = parseInt(point[2]) - 1;
                    setData(indicePositionFromObj, indiceUvsFromObj, indiceNormalFromObj, positions[indicePositionFromObj], uvs[indiceUvsFromObj], normals[indiceNormalFromObj] //Set the vector for each component
                    );
                }
                //Reset variable for the next line
                triangles = [];
            };
            /**
             * Create triangles and push the data for each polygon for the pattern 4
             * In this pattern we get vertice positions and normals
             * @param face
             * @param v
             */
            var setDataForCurrentFaceWithPattern4 = function (face, v) {
                getTriangles(face, v);
                for (var k = 0; k < triangles.length; k++) {
                    //triangle[k] = "1//1"
                    //Split the data for getting position and normals
                    var point = triangles[k].split("//"); // ["1", "1"]
                    // We check indices, and normals
                    var indicePositionFromObj = parseInt(point[0]) - 1;
                    var indiceNormalFromObj = parseInt(point[1]) - 1;
                    setData(indicePositionFromObj, 1, //Default value for uv
                    indiceNormalFromObj, positions[indicePositionFromObj], //Get each vector of data
                    BABYLON.Vector2.Zero(), normals[indiceNormalFromObj]);
                }
                //Reset variable for the next line
                triangles = [];
            };
            /**
             * Create triangles and push the data for each polygon for the pattern 3
             * In this pattern we get vertice positions, uvs and normals
             * @param face
             * @param v
             */
            var setDataForCurrentFaceWithPattern5 = function (face, v) {
                //Get the indices of triangles for each polygon
                getTriangles(face, v);
                for (var k = 0; k < triangles.length; k++) {
                    //triangle[k] = "-1/-1/-1"
                    //Split the data for getting position, uv, and normals
                    var point = triangles[k].split("/"); // ["-1", "-1", "-1"]
                    // Set position indice
                    var indicePositionFromObj = positions.length + parseInt(point[0]);
                    // Set uv indice
                    var indiceUvsFromObj = uvs.length + parseInt(point[1]);
                    // Set normal indice
                    var indiceNormalFromObj = normals.length + parseInt(point[2]);
                    setData(indicePositionFromObj, indiceUvsFromObj, indiceNormalFromObj, positions[indicePositionFromObj], uvs[indiceUvsFromObj], normals[indiceNormalFromObj] //Set the vector for each component
                    );
                }
                //Reset variable for the next line
                triangles = [];
            };
            var addPreviousObjMesh = function () {
                //Check if it is not the first mesh. Otherwise we don't have data.
                if (meshesFromObj.length > 0) {
                    //Get the previous mesh for applying the data about the faces
                    //=> in obj file, faces definition append after the name of the mesh
                    handledMesh = meshesFromObj[meshesFromObj.length - 1];
                    //Set the data into Array for the mesh
                    unwrapData();
                    // Reverse tab. Otherwise face are displayed in the wrong sens
                    indicesForBabylon.reverse();
                    //Set the information for the mesh
                    //Slice the array to avoid rewriting because of the fact this is the same var which be rewrited
                    handledMesh.indices = indicesForBabylon.slice();
                    handledMesh.positions = unwrappedPositionsForBabylon.slice();
                    handledMesh.normals = unwrappedNormalsForBabylon.slice();
                    handledMesh.uvs = unwrappedUVForBabylon.slice();
                    //Reset the array for the next mesh
                    indicesForBabylon = [];
                    unwrappedPositionsForBabylon = [];
                    unwrappedNormalsForBabylon = [];
                    unwrappedUVForBabylon = [];
                }
            };
            //Main function
            //Split the file into lines
            var lines = data.split('\n');
            //Look at each line
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                var result;
                //Comment or newLine
                if (line.length === 0 || line.charAt(0) === '#') {
                    continue;
                    //Get information about one position possible for the vertices
                }
                else if ((result = this.vertexPattern.exec(line)) !== null) {
                    //Create a Vector3 with the position x, y, z
                    //Value of result:
                    // ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]
                    //Add the Vector in the list of positions
                    positions.push(new BABYLON.Vector3(parseFloat(result[1]), parseFloat(result[2]), parseFloat(result[3])));
                }
                else if ((result = this.normalPattern.exec(line)) !== null) {
                    //Create a Vector3 with the normals x, y, z
                    //Value of result
                    // ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]
                    //Add the Vector in the list of normals
                    normals.push(new BABYLON.Vector3(parseFloat(result[1]), parseFloat(result[2]), parseFloat(result[3])));
                }
                else if ((result = this.uvPattern.exec(line)) !== null) {
                    //Create a Vector2 with the normals u, v
                    //Value of result
                    // ["vt 0.1 0.2 0.3", "0.1", "0.2"]
                    //Add the Vector in the list of uvs
                    uvs.push(new BABYLON.Vector2(parseFloat(result[1]), parseFloat(result[2])));
                    //Identify patterns of faces
                    //Face could be defined in different type of pattern
                }
                else if ((result = this.facePattern3.exec(line)) !== null) {
                    //Value of result:
                    //["f 1/1/1 2/2/2 3/3/3", "1/1/1 2/2/2 3/3/3"...]
                    //Set the data for this face
                    setDataForCurrentFaceWithPattern3(result[1].trim().split(" "), // ["1/1/1", "2/2/2", "3/3/3"]
                    1);
                }
                else if ((result = this.facePattern4.exec(line)) !== null) {
                    //Value of result:
                    //["f 1//1 2//2 3//3", "1//1 2//2 3//3"...]
                    //Set the data for this face
                    setDataForCurrentFaceWithPattern4(result[1].trim().split(" "), // ["1//1", "2//2", "3//3"]
                    1);
                }
                else if ((result = this.facePattern5.exec(line)) !== null) {
                    //Value of result:
                    //["f -1/-1/-1 -2/-2/-2 -3/-3/-3", "-1/-1/-1 -2/-2/-2 -3/-3/-3"...]
                    //Set the data for this face
                    setDataForCurrentFaceWithPattern5(result[1].trim().split(" "), // ["-1/-1/-1", "-2/-2/-2", "-3/-3/-3"]
                    1);
                }
                else if ((result = this.facePattern2.exec(line)) !== null) {
                    //Value of result:
                    //["f 1/1 2/2 3/3", "1/1 2/2 3/3"...]
                    //Set the data for this face
                    setDataForCurrentFaceWithPattern2(result[1].trim().split(" "), // ["1/1", "2/2", "3/3"]
                    1);
                }
                else if ((result = this.facePattern1.exec(line)) !== null) {
                    //Value of result
                    //["f 1 2 3", "1 2 3"...]
                    //Set the data for this face
                    setDataForCurrentFaceWithPattern1(result[1].trim().split(" "), // ["1", "2", "3"]
                    1);
                    //Define a mesh or an object
                    //Each time this keyword is analysed, create a new Object with all data for creating a babylonMesh
                }
                else if (this.group.test(line) || this.obj.test(line)) {
                    //Create a new mesh corresponding to the name of the group.
                    //Definition of the mesh
                    var objMesh = 
                    //Set the name of the current obj mesh
                    {
                        name: line.substring(2).trim(),
                        indices: undefined,
                        positions: undefined,
                        normals: undefined,
                        uvs: undefined,
                        materialName: ""
                    };
                    addPreviousObjMesh();
                    //Push the last mesh created with only the name
                    meshesFromObj.push(objMesh);
                    //Set this variable to indicate that now meshesFromObj has objects defined inside
                    hasMeshes = true;
                    isFirstMaterial = true;
                    increment = 1;
                    //Keyword for applying a material
                }
                else if (this.usemtl.test(line)) {
                    //Get the name of the material
                    materialNameFromObj = line.substring(7).trim();
                    //If this new material is in the same mesh
                    if (!isFirstMaterial) {
                        //Set the data for the previous mesh
                        addPreviousObjMesh();
                        //Create a new mesh
                        var objMesh = 
                        //Set the name of the current obj mesh
                        {
                            name: objMeshName + "_mm" + increment.toString(),
                            indices: undefined,
                            positions: undefined,
                            normals: undefined,
                            uvs: undefined,
                            materialName: materialNameFromObj
                        };
                        increment++;
                        //If meshes are already defined
                        meshesFromObj.push(objMesh);
                    }
                    //Set the material name if the previous line define a mesh
                    if (hasMeshes && isFirstMaterial) {
                        //Set the material name to the previous mesh (1 material per mesh)
                        meshesFromObj[meshesFromObj.length - 1].materialName = materialNameFromObj;
                        isFirstMaterial = false;
                    }
                    //Keyword for loading the mtl file
                }
                else if (this.mtllib.test(line)) {
                    //Get the name of mtl file
                    fileToLoad = line.substring(7).trim();
                    //Apply smoothing
                }
                else if (this.smooth.test(line)) {
                    // smooth shading => apply smoothing
                    //Toda  y I don't know it work with babylon and with obj.
                    //With the obj file  an integer is set
                }
                else {
                    //If there is another possibility
                    console.log("Unhandled expression at line : " + line);
                }
            }
            //At the end of the file, add the last mesh into the meshesFromObj array
            if (hasMeshes) {
                //Set the data for the last mesh
                handledMesh = meshesFromObj[meshesFromObj.length - 1];
                //Reverse indices for displaying faces in the good sens
                indicesForBabylon.reverse();
                //Get the good array
                unwrapData();
                //Set array
                handledMesh.indices = indicesForBabylon;
                handledMesh.positions = unwrappedPositionsForBabylon;
                handledMesh.normals = unwrappedNormalsForBabylon;
                handledMesh.uvs = unwrappedUVForBabylon;
            }
            //If any o or g keyword found, create a mesj with a random id
            if (!hasMeshes) {
                // reverse tab of indices
                indicesForBabylon.reverse();
                //Get positions normals uvs
                unwrapData();
                //Set data for one mesh
                meshesFromObj.push({
                    name: BABYLON.Geometry.RandomId(),
                    indices: indicesForBabylon,
                    positions: unwrappedPositionsForBabylon,
                    normals: unwrappedNormalsForBabylon,
                    uvs: unwrappedUVForBabylon,
                    materialName: materialNameFromObj
                });
            }
            //Create a BABYLON.Mesh list
            var babylonMeshesArray = []; //The mesh for babylon
            var materialToUse = new Array();
            //Set data for each mesh
            for (var j = 0; j < meshesFromObj.length; j++) {
                //check meshesNames (stlFileLoader)
                if (meshesNames && meshesFromObj[j].name) {
                    if (meshesNames instanceof Array) {
                        if (meshesNames.indexOf(meshesFromObj[j].name) == -1) {
                            continue;
                        }
                    }
                    else {
                        if (meshesFromObj[j].name !== meshesNames) {
                            continue;
                        }
                    }
                }
                //Get the current mesh
                //Set the data with VertexBuffer for each mesh
                handledMesh = meshesFromObj[j];
                //Create a BABYLON.Mesh with the name of the obj mesh
                var babylonMesh = new BABYLON.Mesh(meshesFromObj[j].name, scene);
                //Push the name of the material to an array
                //This is indispensable for the importMesh function
                materialToUse.push(meshesFromObj[j].materialName);
                var vertexData = new BABYLON.VertexData(); //The container for the values
                //Set the data for the babylonMesh
                vertexData.positions = handledMesh.positions;
                vertexData.normals = handledMesh.normals;
                vertexData.uvs = handledMesh.uvs;
                vertexData.indices = handledMesh.indices;
                //Set the data from the VertexBuffer to the current BABYLON.Mesh
                vertexData.applyToMesh(babylonMesh);
                if (OBJFileLoader.INVERT_Y) {
                    babylonMesh.scaling.y *= -1;
                }
                //Push the mesh into an array
                babylonMeshesArray.push(babylonMesh);
            }
            var mtlPromises = [];
            //load the materials
            //Check if we have a file to load
            if (fileToLoad !== "") {
                //Load the file synchronously
                mtlPromises.push(new Promise(function (resolve, reject) {
                    _this._loadMTL(fileToLoad, rootUrl, function (dataLoaded) {
                        try {
                            //Create materials thanks MTLLoader function
                            materialsFromMTLFile.parseMTL(scene, dataLoaded, rootUrl);
                            //Look at each material loaded in the mtl file
                            for (var n = 0; n < materialsFromMTLFile.materials.length; n++) {
                                //Three variables to get all meshes with the same material
                                var startIndex = 0;
                                var _indices = [];
                                var _index;
                                //The material from MTL file is used in the meshes loaded
                                //Push the indice in an array
                                //Check if the material is not used for another mesh
                                while ((_index = materialToUse.indexOf(materialsFromMTLFile.materials[n].name, startIndex)) > -1) {
                                    _indices.push(_index);
                                    startIndex = _index + 1;
                                }
                                //If the material is not used dispose it
                                if (_index == -1 && _indices.length == 0) {
                                    //If the material is not needed, remove it
                                    materialsFromMTLFile.materials[n].dispose();
                                }
                                else {
                                    for (var o = 0; o < _indices.length; o++) {
                                        //Apply the material to the BABYLON.Mesh for each mesh with the material
                                        babylonMeshesArray[_indices[o]].material = materialsFromMTLFile.materials[n];
                                    }
                                }
                            }
                            resolve();
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                }));
            }
            //Return an array with all BABYLON.Mesh
            return Promise.all(mtlPromises).then(function () {
                return babylonMeshesArray;
            });
        };
        OBJFileLoader.OPTIMIZE_WITH_UV = false;
        OBJFileLoader.INVERT_Y = false;
        return OBJFileLoader;
    }());
    BABYLON.OBJFileLoader = OBJFileLoader;
    if (BABYLON.SceneLoader) {
        //Add this loader into the register plugin
        BABYLON.SceneLoader.RegisterPlugin(new OBJFileLoader());
    }
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.objFileLoader.js.map


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var FireMaterialDefines = /** @class */ (function (_super) {
        __extends(FireMaterialDefines, _super);
        function FireMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.DIFFUSE = false;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.UV1 = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.BonesPerMesh = 0;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.INSTANCES = false;
            _this.rebuild();
            return _this;
        }
        return FireMaterialDefines;
    }(BABYLON.MaterialDefines));
    var FireMaterial = /** @class */ (function (_super) {
        __extends(FireMaterial, _super);
        function FireMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            _this.speed = 1.0;
            _this._scaledDiffuse = new BABYLON.Color3();
            _this._lastTime = 0;
            return _this;
        }
        FireMaterial.prototype.needAlphaBlending = function () {
            return false;
        };
        FireMaterial.prototype.needAlphaTesting = function () {
            return true;
        };
        FireMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        // Methods
        FireMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new FireMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Textures
            if (defines._areTexturesDirty) {
                defines._needUVs = false;
                if (this._diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                    if (!this._diffuseTexture.isReady()) {
                        return false;
                    }
                    else {
                        defines._needUVs = true;
                        defines.DIFFUSE = true;
                    }
                }
            }
            defines.ALPHATEST = this._opacityTexture ? true : false;
            // Misc.
            if (defines._areMiscDirty) {
                defines.POINTSIZE = (this.pointsCloud || scene.forcePointsCloud);
                defines.FOG = (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE && this.fogEnabled);
            }
            // Values that need to be evaluated on every frame
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, false, true);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                // Legacy browser patch
                var shaderName = "fire";
                var join = defines.toString();
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: ["world", "view", "viewProjection", "vEyePosition",
                        "vFogInfos", "vFogColor", "pointSize",
                        "vDiffuseInfos",
                        "mBones",
                        "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4", "diffuseMatrix",
                        // Fire
                        "time", "speed"
                    ],
                    uniformBuffersNames: [],
                    samplers: ["diffuseSampler",
                        // Fire
                        "distortionSampler", "opacitySampler"
                    ],
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: null,
                    maxSimultaneousLights: 4,
                    transformFeedbackVaryings: null
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        FireMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            if (this._mustRebind(scene, effect)) {
                // Textures
                if (this._diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                    this._activeEffect.setTexture("diffuseSampler", this._diffuseTexture);
                    this._activeEffect.setFloat2("vDiffuseInfos", this._diffuseTexture.coordinatesIndex, this._diffuseTexture.level);
                    this._activeEffect.setMatrix("diffuseMatrix", this._diffuseTexture.getTextureMatrix());
                    this._activeEffect.setTexture("distortionSampler", this._distortionTexture);
                    this._activeEffect.setTexture("opacitySampler", this._opacityTexture);
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this._scaledDiffuse, this.alpha * mesh.visibility);
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            // Time
            this._lastTime += scene.getEngine().getDeltaTime();
            this._activeEffect.setFloat("time", this._lastTime);
            // Speed
            this._activeEffect.setFloat("speed", this.speed);
            this._afterBind(mesh, this._activeEffect);
        };
        FireMaterial.prototype.getAnimatables = function () {
            var results = [];
            if (this._diffuseTexture && this._diffuseTexture.animations && this._diffuseTexture.animations.length > 0) {
                results.push(this._diffuseTexture);
            }
            if (this._distortionTexture && this._distortionTexture.animations && this._distortionTexture.animations.length > 0) {
                results.push(this._distortionTexture);
            }
            if (this._opacityTexture && this._opacityTexture.animations && this._opacityTexture.animations.length > 0) {
                results.push(this._opacityTexture);
            }
            return results;
        };
        FireMaterial.prototype.getActiveTextures = function () {
            var activeTextures = _super.prototype.getActiveTextures.call(this);
            if (this._diffuseTexture) {
                activeTextures.push(this._diffuseTexture);
            }
            if (this._distortionTexture) {
                activeTextures.push(this._distortionTexture);
            }
            if (this._opacityTexture) {
                activeTextures.push(this._opacityTexture);
            }
            return activeTextures;
        };
        FireMaterial.prototype.hasTexture = function (texture) {
            if (_super.prototype.hasTexture.call(this, texture)) {
                return true;
            }
            if (this._diffuseTexture === texture) {
                return true;
            }
            if (this._distortionTexture === texture) {
                return true;
            }
            if (this._opacityTexture === texture) {
                return true;
            }
            return false;
        };
        FireMaterial.prototype.getClassName = function () {
            return "FireMaterial";
        };
        FireMaterial.prototype.dispose = function (forceDisposeEffect) {
            if (this._diffuseTexture) {
                this._diffuseTexture.dispose();
            }
            if (this._distortionTexture) {
                this._distortionTexture.dispose();
            }
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        FireMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new FireMaterial(name, _this.getScene()); }, this);
        };
        FireMaterial.prototype.serialize = function () {
            var serializationObject = _super.prototype.serialize.call(this);
            serializationObject.customType = "BABYLON.FireMaterial";
            serializationObject.diffuseColor = this.diffuseColor.asArray();
            serializationObject.speed = this.speed;
            if (this._diffuseTexture) {
                serializationObject._diffuseTexture = this._diffuseTexture.serialize();
            }
            if (this._distortionTexture) {
                serializationObject._distortionTexture = this._distortionTexture.serialize();
            }
            if (this._opacityTexture) {
                serializationObject._opacityTexture = this._opacityTexture.serialize();
            }
            return serializationObject;
        };
        FireMaterial.Parse = function (source, scene, rootUrl) {
            var material = new FireMaterial(source.name, scene);
            material.diffuseColor = BABYLON.Color3.FromArray(source.diffuseColor);
            material.speed = source.speed;
            material.alpha = source.alpha;
            material.id = source.id;
            BABYLON.Tags.AddTagsTo(material, source.tags);
            material.backFaceCulling = source.backFaceCulling;
            material.wireframe = source.wireframe;
            if (source._diffuseTexture) {
                material._diffuseTexture = BABYLON.Texture.Parse(source._diffuseTexture, scene, rootUrl);
            }
            if (source._distortionTexture) {
                material._distortionTexture = BABYLON.Texture.Parse(source._distortionTexture, scene, rootUrl);
            }
            if (source._opacityTexture) {
                material._opacityTexture = BABYLON.Texture.Parse(source._opacityTexture, scene, rootUrl);
            }
            if (source.checkReadyOnlyOnce) {
                material.checkReadyOnlyOnce = source.checkReadyOnlyOnce;
            }
            return material;
        };
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexture")
        ], FireMaterial.prototype, "_diffuseTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], FireMaterial.prototype, "diffuseTexture", void 0);
        __decorate([
            BABYLON.serializeAsTexture("distortionTexture")
        ], FireMaterial.prototype, "_distortionTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], FireMaterial.prototype, "distortionTexture", void 0);
        __decorate([
            BABYLON.serializeAsTexture("opacityTexture")
        ], FireMaterial.prototype, "_opacityTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], FireMaterial.prototype, "opacityTexture", void 0);
        __decorate([
            BABYLON.serializeAsColor3("diffuse")
        ], FireMaterial.prototype, "diffuseColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], FireMaterial.prototype, "speed", void 0);
        return FireMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.FireMaterial = FireMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.fireMaterial.js.map

BABYLON.Effect.ShadersStore['fireVertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n\nuniform float time;\nuniform float speed;\n#ifdef DIFFUSE\nvarying vec2 vDistortionCoords1;\nvarying vec2 vDistortionCoords2;\nvarying vec2 vDistortionCoords3;\n#endif\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n\n#ifdef DIFFUSE\nvDiffuseUV=uv;\nvDiffuseUV.y-=0.2;\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n#ifdef DIFFUSE\n\nvec3 layerSpeed=vec3(-0.2,-0.52,-0.1)*speed;\nvDistortionCoords1.x=uv.x;\nvDistortionCoords1.y=uv.y+layerSpeed.x*time/1000.0;\nvDistortionCoords2.x=uv.x;\nvDistortionCoords2.y=uv.y+layerSpeed.y*time/1000.0;\nvDistortionCoords3.x=uv.x;\nvDistortionCoords3.y=uv.y+layerSpeed.z*time/1000.0;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['firePixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n\nuniform sampler2D distortionSampler;\nuniform sampler2D opacitySampler;\n#ifdef DIFFUSE\nvarying vec2 vDistortionCoords1;\nvarying vec2 vDistortionCoords2;\nvarying vec2 vDistortionCoords3;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvec4 bx2(vec4 x)\n{\nreturn vec4(2.0)*x-vec4(1.0);\n}\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\n\nfloat alpha=1.0;\n#ifdef DIFFUSE\n\nconst float distortionAmount0=0.092;\nconst float distortionAmount1=0.092;\nconst float distortionAmount2=0.092;\nvec2 heightAttenuation=vec2(0.3,0.39);\nvec4 noise0=texture2D(distortionSampler,vDistortionCoords1);\nvec4 noise1=texture2D(distortionSampler,vDistortionCoords2);\nvec4 noise2=texture2D(distortionSampler,vDistortionCoords3);\nvec4 noiseSum=bx2(noise0)*distortionAmount0+bx2(noise1)*distortionAmount1+bx2(noise2)*distortionAmount2;\nvec4 perturbedBaseCoords=vec4(vDiffuseUV,0.0,1.0)+noiseSum*(vDiffuseUV.y*heightAttenuation.x+heightAttenuation.y);\nvec4 opacityColor=texture2D(opacitySampler,perturbedBaseCoords.xy);\n#ifdef ALPHATEST\nif (opacityColor.r<0.1)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor=texture2D(diffuseSampler,perturbedBaseCoords.xy)*2.0;\nbaseColor*=opacityColor;\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\nvec3 diffuseBase=vec3(1.0,1.0,1.0);\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n\nvec4 color=vec4(baseColor.rgb,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var FurMaterialDefines = /** @class */ (function (_super) {
        __extends(FurMaterialDefines, _super);
        function FurMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.DIFFUSE = false;
            _this.HEIGHTMAP = false;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.NORMAL = false;
            _this.UV1 = false;
            _this.UV2 = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.HIGHLEVEL = false;
            _this.rebuild();
            return _this;
        }
        return FurMaterialDefines;
    }(BABYLON.MaterialDefines));
    var FurMaterial = /** @class */ (function (_super) {
        __extends(FurMaterial, _super);
        function FurMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            _this.furLength = 1;
            _this.furAngle = 0;
            _this.furColor = new BABYLON.Color3(0.44, 0.21, 0.02);
            _this.furOffset = 0.0;
            _this.furSpacing = 12;
            _this.furGravity = new BABYLON.Vector3(0, 0, 0);
            _this.furSpeed = 100;
            _this.furDensity = 20;
            _this.furOcclusion = 0.0;
            _this._disableLighting = false;
            _this._maxSimultaneousLights = 4;
            _this.highLevelFur = true;
            _this._furTime = 0;
            return _this;
        }
        Object.defineProperty(FurMaterial.prototype, "furTime", {
            get: function () {
                return this._furTime;
            },
            set: function (furTime) {
                this._furTime = furTime;
            },
            enumerable: true,
            configurable: true
        });
        FurMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0);
        };
        FurMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        FurMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        FurMaterial.prototype.updateFur = function () {
            for (var i = 1; i < this._meshes.length; i++) {
                var offsetFur = this._meshes[i].material;
                offsetFur.furLength = this.furLength;
                offsetFur.furAngle = this.furAngle;
                offsetFur.furGravity = this.furGravity;
                offsetFur.furSpacing = this.furSpacing;
                offsetFur.furSpeed = this.furSpeed;
                offsetFur.furColor = this.furColor;
                offsetFur.diffuseTexture = this.diffuseTexture;
                offsetFur.furTexture = this.furTexture;
                offsetFur.highLevelFur = this.highLevelFur;
                offsetFur.furTime = this.furTime;
                offsetFur.furDensity = this.furDensity;
            }
        };
        // Methods
        FurMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new FurMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Textures
            if (defines._areTexturesDirty) {
                if (scene.texturesEnabled) {
                    if (this.diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                        if (!this.diffuseTexture.isReady()) {
                            return false;
                        }
                        else {
                            defines._needUVs = true;
                            defines.DIFFUSE = true;
                        }
                    }
                    if (this.heightTexture && engine.getCaps().maxVertexTextureImageUnits) {
                        if (!this.heightTexture.isReady()) {
                            return false;
                        }
                        else {
                            defines._needUVs = true;
                            defines.HEIGHTMAP = true;
                        }
                    }
                }
            }
            // High level
            if (this.highLevelFur !== defines.HIGHLEVEL) {
                defines.HIGHLEVEL = true;
                defines.markAsUnprocessed();
            }
            // Misc.
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            // Lights
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);
            // Values that need to be evaluated on every frame
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.UV2) {
                    attribs.push(BABYLON.VertexBuffer.UV2Kind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                // Legacy browser patch
                var shaderName = "fur";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vDiffuseInfos",
                    "mBones",
                    "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4", "diffuseMatrix",
                    "furLength", "furAngle", "furColor", "furOffset", "furGravity", "furTime", "furSpacing", "furDensity", "furOcclusion"
                ];
                var samplers = ["diffuseSampler",
                    "heightTexture", "furTexture"
                ];
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: this.maxSimultaneousLights
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this.maxSimultaneousLights }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        FurMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            if (scene.getCachedMaterial() !== this) {
                // Textures
                if (this._diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                    this._activeEffect.setTexture("diffuseSampler", this._diffuseTexture);
                    this._activeEffect.setFloat2("vDiffuseInfos", this._diffuseTexture.coordinatesIndex, this._diffuseTexture.level);
                    this._activeEffect.setMatrix("diffuseMatrix", this._diffuseTexture.getTextureMatrix());
                }
                if (this._heightTexture) {
                    this._activeEffect.setTexture("heightTexture", this._heightTexture);
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._activeEffect.setFloat("furLength", this.furLength);
            this._activeEffect.setFloat("furAngle", this.furAngle);
            this._activeEffect.setColor4("furColor", this.furColor, 1.0);
            if (this.highLevelFur) {
                this._activeEffect.setVector3("furGravity", this.furGravity);
                this._activeEffect.setFloat("furOffset", this.furOffset);
                this._activeEffect.setFloat("furSpacing", this.furSpacing);
                this._activeEffect.setFloat("furDensity", this.furDensity);
                this._activeEffect.setFloat("furOcclusion", this.furOcclusion);
                this._furTime += this.getScene().getEngine().getDeltaTime() / this.furSpeed;
                this._activeEffect.setFloat("furTime", this._furTime);
                this._activeEffect.setTexture("furTexture", this.furTexture);
            }
            this._afterBind(mesh, this._activeEffect);
        };
        FurMaterial.prototype.getAnimatables = function () {
            var results = [];
            if (this.diffuseTexture && this.diffuseTexture.animations && this.diffuseTexture.animations.length > 0) {
                results.push(this.diffuseTexture);
            }
            if (this.heightTexture && this.heightTexture.animations && this.heightTexture.animations.length > 0) {
                results.push(this.heightTexture);
            }
            return results;
        };
        FurMaterial.prototype.getActiveTextures = function () {
            var activeTextures = _super.prototype.getActiveTextures.call(this);
            if (this._diffuseTexture) {
                activeTextures.push(this._diffuseTexture);
            }
            if (this._heightTexture) {
                activeTextures.push(this._heightTexture);
            }
            return activeTextures;
        };
        FurMaterial.prototype.hasTexture = function (texture) {
            if (_super.prototype.hasTexture.call(this, texture)) {
                return true;
            }
            if (this.diffuseTexture === texture) {
                return true;
            }
            if (this._heightTexture === texture) {
                return true;
            }
            return false;
        };
        FurMaterial.prototype.dispose = function (forceDisposeEffect) {
            if (this.diffuseTexture) {
                this.diffuseTexture.dispose();
            }
            if (this._meshes) {
                for (var i = 1; i < this._meshes.length; i++) {
                    var mat = this._meshes[i].material;
                    if (mat) {
                        mat.dispose(forceDisposeEffect);
                    }
                    this._meshes[i].dispose();
                }
            }
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        FurMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new FurMaterial(name, _this.getScene()); }, this);
        };
        FurMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.FurMaterial";
            if (this._meshes) {
                serializationObject.sourceMeshName = this._meshes[0].name;
                serializationObject.quality = this._meshes.length;
            }
            return serializationObject;
        };
        FurMaterial.prototype.getClassName = function () {
            return "FurMaterial";
        };
        // Statics
        FurMaterial.Parse = function (source, scene, rootUrl) {
            var material = BABYLON.SerializationHelper.Parse(function () { return new FurMaterial(source.name, scene); }, source, scene, rootUrl);
            if (source.sourceMeshName && material.highLevelFur) {
                scene.executeWhenReady(function () {
                    var sourceMesh = scene.getMeshByName(source.sourceMeshName);
                    if (sourceMesh) {
                        var furTexture = FurMaterial.GenerateTexture("Fur Texture", scene);
                        material.furTexture = furTexture;
                        FurMaterial.FurifyMesh(sourceMesh, source.quality);
                    }
                });
            }
            return material;
        };
        FurMaterial.GenerateTexture = function (name, scene) {
            // Generate fur textures
            var texture = new BABYLON.DynamicTexture("FurTexture " + name, 256, scene, true);
            var context = texture.getContext();
            for (var i = 0; i < 20000; ++i) {
                context.fillStyle = "rgba(255, " + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", 1)";
                context.fillRect((Math.random() * texture.getSize().width), (Math.random() * texture.getSize().height), 2, 2);
            }
            texture.update(false);
            texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
            texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
            return texture;
        };
        // Creates and returns an array of meshes used as shells for the Fur Material
        // that can be disposed later in your code
        // The quality is in interval [0, 100]
        FurMaterial.FurifyMesh = function (sourceMesh, quality) {
            var meshes = [sourceMesh];
            var mat = sourceMesh.material;
            var i;
            if (!(mat instanceof FurMaterial)) {
                throw "The material of the source mesh must be a Fur Material";
            }
            for (i = 1; i < quality; i++) {
                var offsetFur = new BABYLON.FurMaterial(mat.name + i, sourceMesh.getScene());
                sourceMesh.getScene().materials.pop();
                BABYLON.Tags.EnableFor(offsetFur);
                BABYLON.Tags.AddTagsTo(offsetFur, "furShellMaterial");
                offsetFur.furLength = mat.furLength;
                offsetFur.furAngle = mat.furAngle;
                offsetFur.furGravity = mat.furGravity;
                offsetFur.furSpacing = mat.furSpacing;
                offsetFur.furSpeed = mat.furSpeed;
                offsetFur.furColor = mat.furColor;
                offsetFur.diffuseTexture = mat.diffuseTexture;
                offsetFur.furOffset = i / quality;
                offsetFur.furTexture = mat.furTexture;
                offsetFur.highLevelFur = mat.highLevelFur;
                offsetFur.furTime = mat.furTime;
                offsetFur.furDensity = mat.furDensity;
                var offsetMesh = sourceMesh.clone(sourceMesh.name + i);
                offsetMesh.material = offsetFur;
                offsetMesh.skeleton = sourceMesh.skeleton;
                offsetMesh.position = BABYLON.Vector3.Zero();
                meshes.push(offsetMesh);
            }
            for (i = 1; i < meshes.length; i++) {
                meshes[i].parent = sourceMesh;
            }
            sourceMesh.material._meshes = meshes;
            return meshes;
        };
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexture")
        ], FurMaterial.prototype, "_diffuseTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], FurMaterial.prototype, "diffuseTexture", void 0);
        __decorate([
            BABYLON.serializeAsTexture("heightTexture")
        ], FurMaterial.prototype, "_heightTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], FurMaterial.prototype, "heightTexture", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], FurMaterial.prototype, "diffuseColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "furLength", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "furAngle", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], FurMaterial.prototype, "furColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "furOffset", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "furSpacing", void 0);
        __decorate([
            BABYLON.serializeAsVector3()
        ], FurMaterial.prototype, "furGravity", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "furSpeed", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "furDensity", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "furOcclusion", void 0);
        __decorate([
            BABYLON.serialize("disableLighting")
        ], FurMaterial.prototype, "_disableLighting", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], FurMaterial.prototype, "disableLighting", void 0);
        __decorate([
            BABYLON.serialize("maxSimultaneousLights")
        ], FurMaterial.prototype, "_maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], FurMaterial.prototype, "maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "highLevelFur", void 0);
        __decorate([
            BABYLON.serialize()
        ], FurMaterial.prototype, "furTime", null);
        return FurMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.FurMaterial = FurMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.furMaterial.js.map

BABYLON.Effect.ShadersStore['furVertexShader'] = "precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\nuniform float furLength;\nuniform float furAngle;\n#ifdef HIGHLEVEL\nuniform float furOffset;\nuniform vec3 furGravity;\nuniform float furTime;\nuniform float furSpacing;\nuniform float furDensity;\n#endif\n#ifdef HEIGHTMAP\nuniform sampler2D heightTexture;\n#endif\n#ifdef HIGHLEVEL\nvarying vec2 vFurUV;\n#endif\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\nvarying float vfur_length;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nfloat Rand(vec3 rv) {\nfloat x=dot(rv,vec3(12.9898,78.233,24.65487));\nreturn fract(sin(x)*43758.5453);\n}\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\n\nfloat r=Rand(position);\n#ifdef HEIGHTMAP\n#if __VERSION__>100\nvfur_length=furLength*texture(heightTexture,uv).x;\n#else\nvfur_length=furLength*texture2D(heightTexture,uv).r;\n#endif\n#else \nvfur_length=(furLength*r);\n#endif\nvec3 tangent1=vec3(normal.y,-normal.x,0);\nvec3 tangent2=vec3(-normal.z,0,normal.x);\nr=Rand(tangent1*r);\nfloat J=(2.0+4.0*r);\nr=Rand(tangent2*r);\nfloat K=(2.0+2.0*r);\ntangent1=tangent1*J+tangent2*K;\ntangent1=normalize(tangent1);\nvec3 newPosition=position+normal*vfur_length*cos(furAngle)+tangent1*vfur_length*sin(furAngle);\n#ifdef HIGHLEVEL\n\nvec3 forceDirection=vec3(0.0,0.0,0.0);\nforceDirection.x=sin(furTime+position.x*0.05)*0.2;\nforceDirection.y=cos(furTime*0.7+position.y*0.04)*0.2;\nforceDirection.z=sin(furTime*0.7+position.z*0.04)*0.2;\nvec3 displacement=vec3(0.0,0.0,0.0);\ndisplacement=furGravity+forceDirection;\nfloat displacementFactor=pow(furOffset,3.0);\nvec3 aNormal=normal;\naNormal.xyz+=displacement*displacementFactor;\nnewPosition=vec3(newPosition.x,newPosition.y,newPosition.z)+(normalize(aNormal)*furOffset*furSpacing);\n#endif\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\ngl_Position=viewProjection*finalWorld*vec4(newPosition,1.0);\nvec4 worldPos=finalWorld*vec4(newPosition,1.0);\nvPositionW=vec3(worldPos);\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#ifdef HIGHLEVEL\nvFurUV=vDiffuseUV*furDensity;\n#endif\n#else\n#ifdef HIGHLEVEL\nvFurUV=uv*furDensity;\n#endif\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['furPixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nuniform vec4 furColor;\nuniform float furLength;\nvarying vec3 vPositionW;\nvarying float vfur_length;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n\n#ifdef HIGHLEVEL\nuniform float furOffset;\nuniform float furOcclusion;\nuniform sampler2D furTexture;\nvarying vec2 vFurUV;\n#endif\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n#include<fogFragmentDeclaration>\n#include<clipPlaneFragmentDeclaration>\nfloat Rand(vec3 rv) {\nfloat x=dot(rv,vec3(12.9898,78.233,24.65487));\nreturn fract(sin(x)*43758.5453);\n}\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=furColor;\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\nbaseColor*=texture2D(diffuseSampler,vDiffuseUV);\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n#ifdef HIGHLEVEL\n\nvec4 furTextureColor=texture2D(furTexture,vec2(vFurUV.x,vFurUV.y));\nif (furTextureColor.a<=0.0 || furTextureColor.g<furOffset) {\ndiscard;\n}\nfloat occlusion=mix(0.0,furTextureColor.b*1.2,furOffset);\nbaseColor=vec4(baseColor.xyz*max(occlusion,furOcclusion),1.1-furOffset);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#ifdef SPECULARTERM\nvec3 specularBase=vec3(0.,0.,0.);\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase.rgb*baseColor.rgb,0.0,1.0);\n\n#ifdef HIGHLEVEL\nvec4 color=vec4(finalDiffuse,alpha);\n#else\nfloat r=vfur_length/furLength*0.5;\nvec4 color=vec4(finalDiffuse*(0.5+r),alpha);\n#endif\n#include<fogFragment>\ngl_FragColor=color;\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var GradientMaterialDefines = /** @class */ (function (_super) {
        __extends(GradientMaterialDefines, _super);
        function GradientMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.DIFFUSE = false;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.LIGHT0 = false;
            _this.LIGHT1 = false;
            _this.LIGHT2 = false;
            _this.LIGHT3 = false;
            _this.SPOTLIGHT0 = false;
            _this.SPOTLIGHT1 = false;
            _this.SPOTLIGHT2 = false;
            _this.SPOTLIGHT3 = false;
            _this.HEMILIGHT0 = false;
            _this.HEMILIGHT1 = false;
            _this.HEMILIGHT2 = false;
            _this.HEMILIGHT3 = false;
            _this.DIRLIGHT0 = false;
            _this.DIRLIGHT1 = false;
            _this.DIRLIGHT2 = false;
            _this.DIRLIGHT3 = false;
            _this.POINTLIGHT0 = false;
            _this.POINTLIGHT1 = false;
            _this.POINTLIGHT2 = false;
            _this.POINTLIGHT3 = false;
            _this.SHADOW0 = false;
            _this.SHADOW1 = false;
            _this.SHADOW2 = false;
            _this.SHADOW3 = false;
            _this.SHADOWS = false;
            _this.SHADOWESM0 = false;
            _this.SHADOWESM1 = false;
            _this.SHADOWESM2 = false;
            _this.SHADOWESM3 = false;
            _this.SHADOWPOISSON0 = false;
            _this.SHADOWPOISSON1 = false;
            _this.SHADOWPOISSON2 = false;
            _this.SHADOWPOISSON3 = false;
            _this.SHADOWPCF0 = false;
            _this.SHADOWPCF1 = false;
            _this.SHADOWPCF2 = false;
            _this.SHADOWPCF3 = false;
            _this.SHADOWPCSS0 = false;
            _this.SHADOWPCSS1 = false;
            _this.SHADOWPCSS2 = false;
            _this.SHADOWPCSS3 = false;
            _this.NORMAL = false;
            _this.UV1 = false;
            _this.UV2 = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.rebuild();
            return _this;
        }
        return GradientMaterialDefines;
    }(BABYLON.MaterialDefines));
    var GradientMaterial = /** @class */ (function (_super) {
        __extends(GradientMaterial, _super);
        function GradientMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this._maxSimultaneousLights = 4;
            // The gradient top color, red by default
            _this.topColor = new BABYLON.Color3(1, 0, 0);
            _this.topColorAlpha = 1.0;
            // The gradient top color, blue by default
            _this.bottomColor = new BABYLON.Color3(0, 0, 1);
            _this.bottomColorAlpha = 1.0;
            // Gradient offset
            _this.offset = 0;
            _this.scale = 1.0;
            _this.smoothness = 1.0;
            _this.disableLighting = false;
            _this._scaledDiffuse = new BABYLON.Color3();
            return _this;
        }
        GradientMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0 || this.topColorAlpha < 1.0 || this.bottomColorAlpha < 1.0);
        };
        GradientMaterial.prototype.needAlphaTesting = function () {
            return true;
        };
        GradientMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        // Methods
        GradientMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new GradientMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, false, true);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.UV2) {
                    attribs.push(BABYLON.VertexBuffer.UV2Kind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                // Legacy browser patch
                var shaderName = "gradient";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vDiffuseInfos",
                    "mBones",
                    "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4", "diffuseMatrix",
                    "topColor", "bottomColor", "offset", "smoothness", "scale"
                ];
                var samplers = ["diffuseSampler"];
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: 4
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: 4 }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        GradientMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, effect);
            if (this._mustRebind(scene, effect)) {
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(effect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this._scaledDiffuse, this.alpha * mesh.visibility);
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._activeEffect.setColor4("topColor", this.topColor, this.topColorAlpha);
            this._activeEffect.setColor4("bottomColor", this.bottomColor, this.bottomColorAlpha);
            this._activeEffect.setFloat("offset", this.offset);
            this._activeEffect.setFloat("scale", this.scale);
            this._activeEffect.setFloat("smoothness", this.smoothness);
            this._afterBind(mesh, this._activeEffect);
        };
        GradientMaterial.prototype.getAnimatables = function () {
            return [];
        };
        GradientMaterial.prototype.dispose = function (forceDisposeEffect) {
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        GradientMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new GradientMaterial(name, _this.getScene()); }, this);
        };
        GradientMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.GradientMaterial";
            return serializationObject;
        };
        GradientMaterial.prototype.getClassName = function () {
            return "GradientMaterial";
        };
        // Statics
        GradientMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new GradientMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        __decorate([
            BABYLON.serialize("maxSimultaneousLights")
        ], GradientMaterial.prototype, "_maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], GradientMaterial.prototype, "maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], GradientMaterial.prototype, "topColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], GradientMaterial.prototype, "topColorAlpha", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], GradientMaterial.prototype, "bottomColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], GradientMaterial.prototype, "bottomColorAlpha", void 0);
        __decorate([
            BABYLON.serialize()
        ], GradientMaterial.prototype, "offset", void 0);
        __decorate([
            BABYLON.serialize()
        ], GradientMaterial.prototype, "scale", void 0);
        __decorate([
            BABYLON.serialize()
        ], GradientMaterial.prototype, "smoothness", void 0);
        __decorate([
            BABYLON.serialize()
        ], GradientMaterial.prototype, "disableLighting", void 0);
        return GradientMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.GradientMaterial = GradientMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.gradientMaterial.js.map

BABYLON.Effect.ShadersStore['gradientVertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\nvarying vec3 vPosition;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex> \ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\nvPosition=position;\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['gradientPixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nuniform vec4 topColor;\nuniform vec4 bottomColor;\nuniform float offset;\nuniform float scale;\nuniform float smoothness;\n\nvarying vec3 vPositionW;\nvarying vec3 vPosition;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0]\n#include<__decl__lightFragment>[1]\n#include<__decl__lightFragment>[2]\n#include<__decl__lightFragment>[3]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\nfloat h=vPosition.y*scale+offset;\nfloat mysmoothness=clamp(smoothness,0.01,max(smoothness,10.));\nvec4 baseColor=mix(bottomColor,topColor,max(pow(max(h,0.0),mysmoothness),0.0));\n\nvec3 diffuseColor=baseColor.rgb;\n\nfloat alpha=baseColor.a;\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#include<lightFragment>[0]\n#include<lightFragment>[1]\n#include<lightFragment>[2]\n#include<lightFragment>[3]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}\n";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var GridMaterialDefines = /** @class */ (function (_super) {
        __extends(GridMaterialDefines, _super);
        function GridMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.TRANSPARENT = false;
            _this.FOG = false;
            _this.PREMULTIPLYALPHA = false;
            _this.rebuild();
            return _this;
        }
        return GridMaterialDefines;
    }(BABYLON.MaterialDefines));
    /**
     * The grid materials allows you to wrap any shape with a grid.
     * Colors are customizable.
     */
    var GridMaterial = /** @class */ (function (_super) {
        __extends(GridMaterial, _super);
        /**
         * constructor
         * @param name The name given to the material in order to identify it afterwards.
         * @param scene The scene the material is used in.
         */
        function GridMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            /**
             * Main color of the grid (e.g. between lines)
             */
            _this.mainColor = BABYLON.Color3.Black();
            /**
             * Color of the grid lines.
             */
            _this.lineColor = BABYLON.Color3.Teal();
            /**
             * The scale of the grid compared to unit.
             */
            _this.gridRatio = 1.0;
            /**
             * Allows setting an offset for the grid lines.
             */
            _this.gridOffset = BABYLON.Vector3.Zero();
            /**
             * The frequency of thicker lines.
             */
            _this.majorUnitFrequency = 10;
            /**
             * The visibility of minor units in the grid.
             */
            _this.minorUnitVisibility = 0.33;
            /**
             * The grid opacity outside of the lines.
             */
            _this.opacity = 1.0;
            /**
             * Determine RBG output is premultiplied by alpha value.
             */
            _this.preMultiplyAlpha = false;
            _this._gridControl = new BABYLON.Vector4(_this.gridRatio, _this.majorUnitFrequency, _this.minorUnitVisibility, _this.opacity);
            return _this;
        }
        /**
         * Returns wehter or not the grid requires alpha blending.
         */
        GridMaterial.prototype.needAlphaBlending = function () {
            return this.opacity < 1.0;
        };
        GridMaterial.prototype.needAlphaBlendingForMesh = function (mesh) {
            return this.needAlphaBlending();
        };
        GridMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new GridMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            if (defines.TRANSPARENT !== (this.opacity < 1.0)) {
                defines.TRANSPARENT = !defines.TRANSPARENT;
                defines.markAsUnprocessed();
            }
            if (defines.PREMULTIPLYALPHA != this.preMultiplyAlpha) {
                defines.PREMULTIPLYALPHA = !defines.PREMULTIPLYALPHA;
                defines.markAsUnprocessed();
            }
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, false, this.fogEnabled, false, defines);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind, BABYLON.VertexBuffer.NormalKind];
                // Defines
                var join = defines.toString();
                subMesh.setEffect(scene.getEngine().createEffect("grid", attribs, ["projection", "worldView", "mainColor", "lineColor", "gridControl", "gridOffset", "vFogInfos", "vFogColor", "world", "view"], [], join, undefined, this.onCompiled, this.onError), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        GridMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("worldView", world.multiply(scene.getViewMatrix()));
            this._activeEffect.setMatrix("view", scene.getViewMatrix());
            this._activeEffect.setMatrix("projection", scene.getProjectionMatrix());
            // Uniforms
            if (this._mustRebind(scene, effect)) {
                this._activeEffect.setColor3("mainColor", this.mainColor);
                this._activeEffect.setColor3("lineColor", this.lineColor);
                this._activeEffect.setVector3("gridOffset", this.gridOffset);
                this._gridControl.x = this.gridRatio;
                this._gridControl.y = Math.round(this.majorUnitFrequency);
                this._gridControl.z = this.minorUnitVisibility;
                this._gridControl.w = this.opacity;
                this._activeEffect.setVector4("gridControl", this._gridControl);
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._afterBind(mesh, this._activeEffect);
        };
        GridMaterial.prototype.dispose = function (forceDisposeEffect) {
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        GridMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new GridMaterial(name, _this.getScene()); }, this);
        };
        GridMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.GridMaterial";
            return serializationObject;
        };
        GridMaterial.prototype.getClassName = function () {
            return "GridMaterial";
        };
        GridMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new GridMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        __decorate([
            BABYLON.serializeAsColor3()
        ], GridMaterial.prototype, "mainColor", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], GridMaterial.prototype, "lineColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], GridMaterial.prototype, "gridRatio", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], GridMaterial.prototype, "gridOffset", void 0);
        __decorate([
            BABYLON.serialize()
        ], GridMaterial.prototype, "majorUnitFrequency", void 0);
        __decorate([
            BABYLON.serialize()
        ], GridMaterial.prototype, "minorUnitVisibility", void 0);
        __decorate([
            BABYLON.serialize()
        ], GridMaterial.prototype, "opacity", void 0);
        __decorate([
            BABYLON.serialize()
        ], GridMaterial.prototype, "preMultiplyAlpha", void 0);
        return GridMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.GridMaterial = GridMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.gridmaterial.js.map

BABYLON.Effect.ShadersStore['gridVertexShader'] = "precision highp float;\n\nattribute vec3 position;\nattribute vec3 normal;\n\nuniform mat4 projection;\nuniform mat4 world;\nuniform mat4 view;\nuniform mat4 worldView;\n\n#ifdef TRANSPARENT\nvarying vec4 vCameraSpacePosition;\n#endif\nvarying vec3 vPosition;\nvarying vec3 vNormal;\n#include<fogVertexDeclaration>\nvoid main(void) {\n#ifdef FOG\nvec4 worldPos=world*vec4(position,1.0);\n#endif\n#include<fogVertex>\nvec4 cameraSpacePosition=worldView*vec4(position,1.0);\ngl_Position=projection*cameraSpacePosition;\n#ifdef TRANSPARENT\nvCameraSpacePosition=cameraSpacePosition;\n#endif\nvPosition=position;\nvNormal=normal;\n}";
BABYLON.Effect.ShadersStore['gridPixelShader'] = "#extension GL_OES_standard_derivatives : enable\n#define SQRT2 1.41421356\n#define PI 3.14159\nprecision highp float;\nuniform vec3 mainColor;\nuniform vec3 lineColor;\nuniform vec4 gridControl;\nuniform vec3 gridOffset;\n\n#ifdef TRANSPARENT\nvarying vec4 vCameraSpacePosition;\n#endif\nvarying vec3 vPosition;\nvarying vec3 vNormal;\n#include<fogFragmentDeclaration>\nfloat getVisibility(float position) {\n\nfloat majorGridFrequency=gridControl.y;\nif (floor(position+0.5) == floor(position/majorGridFrequency+0.5)*majorGridFrequency)\n{\nreturn 1.0;\n} \nreturn gridControl.z;\n}\nfloat getAnisotropicAttenuation(float differentialLength) {\nconst float maxNumberOfLines=10.0;\nreturn clamp(1.0/(differentialLength+1.0)-1.0/maxNumberOfLines,0.0,1.0);\n}\nfloat isPointOnLine(float position,float differentialLength) {\nfloat fractionPartOfPosition=position-floor(position+0.5); \nfractionPartOfPosition/=differentialLength; \nfractionPartOfPosition=clamp(fractionPartOfPosition,-1.,1.);\nfloat result=0.5+0.5*cos(fractionPartOfPosition*PI); \nreturn result; \n}\nfloat contributionOnAxis(float position) {\nfloat differentialLength=length(vec2(dFdx(position),dFdy(position)));\ndifferentialLength*=SQRT2; \n\nfloat result=isPointOnLine(position,differentialLength);\n\nfloat visibility=getVisibility(position);\nresult*=visibility;\n\nfloat anisotropicAttenuation=getAnisotropicAttenuation(differentialLength);\nresult*=anisotropicAttenuation;\nreturn result;\n}\nfloat normalImpactOnAxis(float x) {\nfloat normalImpact=clamp(1.0-3.0*abs(x*x*x),0.0,1.0);\nreturn normalImpact;\n}\nvoid main(void) {\n\nfloat gridRatio=gridControl.x;\nvec3 gridPos=(vPosition+gridOffset)/gridRatio;\n\nfloat x=contributionOnAxis(gridPos.x);\nfloat y=contributionOnAxis(gridPos.y);\nfloat z=contributionOnAxis(gridPos.z);\n\nvec3 normal=normalize(vNormal);\nx*=normalImpactOnAxis(normal.x);\ny*=normalImpactOnAxis(normal.y);\nz*=normalImpactOnAxis(normal.z);\n\nfloat grid=clamp(x+y+z,0.,1.);\n\nvec3 color=mix(mainColor,lineColor,grid);\n#ifdef FOG\n#include<fogFragment>\n#endif\n#ifdef TRANSPARENT\nfloat distanceToFragment=length(vCameraSpacePosition.xyz);\nfloat cameraPassThrough=clamp(distanceToFragment-0.25,0.0,1.0);\nfloat opacity=clamp(grid,0.08,cameraPassThrough*gridControl.w*grid);\ngl_FragColor=vec4(color.rgb,opacity);\n#ifdef PREMULTIPLYALPHA\ngl_FragColor.rgb*=opacity;\n#endif\n#else\n\ngl_FragColor=vec4(color.rgb,1.0);\n#endif\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var LavaMaterialDefines = /** @class */ (function (_super) {
        __extends(LavaMaterialDefines, _super);
        function LavaMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.DIFFUSE = false;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.LIGHT0 = false;
            _this.LIGHT1 = false;
            _this.LIGHT2 = false;
            _this.LIGHT3 = false;
            _this.SPOTLIGHT0 = false;
            _this.SPOTLIGHT1 = false;
            _this.SPOTLIGHT2 = false;
            _this.SPOTLIGHT3 = false;
            _this.HEMILIGHT0 = false;
            _this.HEMILIGHT1 = false;
            _this.HEMILIGHT2 = false;
            _this.HEMILIGHT3 = false;
            _this.DIRLIGHT0 = false;
            _this.DIRLIGHT1 = false;
            _this.DIRLIGHT2 = false;
            _this.DIRLIGHT3 = false;
            _this.POINTLIGHT0 = false;
            _this.POINTLIGHT1 = false;
            _this.POINTLIGHT2 = false;
            _this.POINTLIGHT3 = false;
            _this.SHADOW0 = false;
            _this.SHADOW1 = false;
            _this.SHADOW2 = false;
            _this.SHADOW3 = false;
            _this.SHADOWS = false;
            _this.SHADOWESM0 = false;
            _this.SHADOWESM1 = false;
            _this.SHADOWESM2 = false;
            _this.SHADOWESM3 = false;
            _this.SHADOWPOISSON0 = false;
            _this.SHADOWPOISSON1 = false;
            _this.SHADOWPOISSON2 = false;
            _this.SHADOWPOISSON3 = false;
            _this.SHADOWPCF0 = false;
            _this.SHADOWPCF1 = false;
            _this.SHADOWPCF2 = false;
            _this.SHADOWPCF3 = false;
            _this.SHADOWPCSS0 = false;
            _this.SHADOWPCSS1 = false;
            _this.SHADOWPCSS2 = false;
            _this.SHADOWPCSS3 = false;
            _this.NORMAL = false;
            _this.UV1 = false;
            _this.UV2 = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.UNLIT = false;
            _this.rebuild();
            return _this;
        }
        return LavaMaterialDefines;
    }(BABYLON.MaterialDefines));
    var LavaMaterial = /** @class */ (function (_super) {
        __extends(LavaMaterial, _super);
        function LavaMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this.speed = 1;
            _this.movingSpeed = 1;
            _this.lowFrequencySpeed = 1;
            _this.fogDensity = 0.15;
            _this._lastTime = 0;
            _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            _this._disableLighting = false;
            _this._unlit = false;
            _this._maxSimultaneousLights = 4;
            _this._scaledDiffuse = new BABYLON.Color3();
            return _this;
        }
        LavaMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0);
        };
        LavaMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        LavaMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        // Methods
        LavaMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new LavaMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Textures
            if (defines._areTexturesDirty) {
                defines._needUVs = false;
                if (scene.texturesEnabled) {
                    if (this._diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                        if (!this._diffuseTexture.isReady()) {
                            return false;
                        }
                        else {
                            defines._needUVs = true;
                            defines.DIFFUSE = true;
                        }
                    }
                }
            }
            // Misc.
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            // Lights
            defines._needNormals = true;
            BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);
            // Values that need to be evaluated on every frame
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.UV2) {
                    attribs.push(BABYLON.VertexBuffer.UV2Kind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                // Legacy browser patch
                var shaderName = "lava";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vDiffuseInfos",
                    "mBones",
                    "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4", "diffuseMatrix",
                    "time", "speed", "movingSpeed",
                    "fogColor", "fogDensity", "lowFrequencySpeed"
                ];
                var samplers = ["diffuseSampler",
                    "noiseTexture"
                ];
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: this.maxSimultaneousLights
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this.maxSimultaneousLights }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        LavaMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            defines.UNLIT = this._unlit;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            if (this._mustRebind(scene, effect)) {
                // Textures
                if (this.diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                    this._activeEffect.setTexture("diffuseSampler", this.diffuseTexture);
                    this._activeEffect.setFloat2("vDiffuseInfos", this.diffuseTexture.coordinatesIndex, this.diffuseTexture.level);
                    this._activeEffect.setMatrix("diffuseMatrix", this.diffuseTexture.getTextureMatrix());
                }
                if (this.noiseTexture) {
                    this._activeEffect.setTexture("noiseTexture", this.noiseTexture);
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this._scaledDiffuse, this.alpha * mesh.visibility);
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._lastTime += scene.getEngine().getDeltaTime();
            this._activeEffect.setFloat("time", this._lastTime * this.speed / 1000);
            if (!this.fogColor) {
                this.fogColor = BABYLON.Color3.Black();
            }
            this._activeEffect.setColor3("fogColor", this.fogColor);
            this._activeEffect.setFloat("fogDensity", this.fogDensity);
            this._activeEffect.setFloat("lowFrequencySpeed", this.lowFrequencySpeed);
            this._activeEffect.setFloat("movingSpeed", this.movingSpeed);
            this._afterBind(mesh, this._activeEffect);
        };
        LavaMaterial.prototype.getAnimatables = function () {
            var results = [];
            if (this.diffuseTexture && this.diffuseTexture.animations && this.diffuseTexture.animations.length > 0) {
                results.push(this.diffuseTexture);
            }
            if (this.noiseTexture && this.noiseTexture.animations && this.noiseTexture.animations.length > 0) {
                results.push(this.noiseTexture);
            }
            return results;
        };
        LavaMaterial.prototype.getActiveTextures = function () {
            var activeTextures = _super.prototype.getActiveTextures.call(this);
            if (this._diffuseTexture) {
                activeTextures.push(this._diffuseTexture);
            }
            return activeTextures;
        };
        LavaMaterial.prototype.hasTexture = function (texture) {
            if (_super.prototype.hasTexture.call(this, texture)) {
                return true;
            }
            if (this.diffuseTexture === texture) {
                return true;
            }
            return false;
        };
        LavaMaterial.prototype.dispose = function (forceDisposeEffect) {
            if (this.diffuseTexture) {
                this.diffuseTexture.dispose();
            }
            if (this.noiseTexture) {
                this.noiseTexture.dispose();
            }
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        LavaMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new LavaMaterial(name, _this.getScene()); }, this);
        };
        LavaMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.LavaMaterial";
            return serializationObject;
        };
        LavaMaterial.prototype.getClassName = function () {
            return "LavaMaterial";
        };
        // Statics
        LavaMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new LavaMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexture")
        ], LavaMaterial.prototype, "_diffuseTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], LavaMaterial.prototype, "diffuseTexture", void 0);
        __decorate([
            BABYLON.serializeAsTexture()
        ], LavaMaterial.prototype, "noiseTexture", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], LavaMaterial.prototype, "fogColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], LavaMaterial.prototype, "speed", void 0);
        __decorate([
            BABYLON.serialize()
        ], LavaMaterial.prototype, "movingSpeed", void 0);
        __decorate([
            BABYLON.serialize()
        ], LavaMaterial.prototype, "lowFrequencySpeed", void 0);
        __decorate([
            BABYLON.serialize()
        ], LavaMaterial.prototype, "fogDensity", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], LavaMaterial.prototype, "diffuseColor", void 0);
        __decorate([
            BABYLON.serialize("disableLighting")
        ], LavaMaterial.prototype, "_disableLighting", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], LavaMaterial.prototype, "disableLighting", void 0);
        __decorate([
            BABYLON.serialize("unlit")
        ], LavaMaterial.prototype, "_unlit", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], LavaMaterial.prototype, "unlit", void 0);
        __decorate([
            BABYLON.serialize("maxSimultaneousLights")
        ], LavaMaterial.prototype, "_maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], LavaMaterial.prototype, "maxSimultaneousLights", void 0);
        return LavaMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.LavaMaterial = LavaMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.lavaMaterial.js.map

BABYLON.Effect.ShadersStore['lavaVertexShader'] = "precision highp float;\n\nuniform float time;\nuniform float lowFrequencySpeed;\n\nvarying float noise;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n\n\n\nvec3 mod289(vec3 x)\n{\nreturn x-floor(x*(1.0/289.0))*289.0;\n}\nvec4 mod289(vec4 x)\n{\nreturn x-floor(x*(1.0/289.0))*289.0;\n}\nvec4 permute(vec4 x)\n{\nreturn mod289(((x*34.0)+1.0)*x);\n}\nvec4 taylorInvSqrt(vec4 r)\n{\nreturn 1.79284291400159-0.85373472095314*r;\n}\nvec3 fade(vec3 t) {\nreturn t*t*t*(t*(t*6.0-15.0)+10.0);\n}\n\nfloat pnoise(vec3 P,vec3 rep)\n{\nvec3 Pi0=mod(floor(P),rep); \nvec3 Pi1=mod(Pi0+vec3(1.0),rep); \nPi0=mod289(Pi0);\nPi1=mod289(Pi1);\nvec3 Pf0=fract(P); \nvec3 Pf1=Pf0-vec3(1.0); \nvec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);\nvec4 iy=vec4(Pi0.yy,Pi1.yy);\nvec4 iz0=Pi0.zzzz;\nvec4 iz1=Pi1.zzzz;\nvec4 ixy=permute(permute(ix)+iy);\nvec4 ixy0=permute(ixy+iz0);\nvec4 ixy1=permute(ixy+iz1);\nvec4 gx0=ixy0*(1.0/7.0);\nvec4 gy0=fract(floor(gx0)*(1.0/7.0))-0.5;\ngx0=fract(gx0);\nvec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);\nvec4 sz0=step(gz0,vec4(0.0));\ngx0-=sz0*(step(0.0,gx0)-0.5);\ngy0-=sz0*(step(0.0,gy0)-0.5);\nvec4 gx1=ixy1*(1.0/7.0);\nvec4 gy1=fract(floor(gx1)*(1.0/7.0))-0.5;\ngx1=fract(gx1);\nvec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);\nvec4 sz1=step(gz1,vec4(0.0));\ngx1-=sz1*(step(0.0,gx1)-0.5);\ngy1-=sz1*(step(0.0,gy1)-0.5);\nvec3 g000=vec3(gx0.x,gy0.x,gz0.x);\nvec3 g100=vec3(gx0.y,gy0.y,gz0.y);\nvec3 g010=vec3(gx0.z,gy0.z,gz0.z);\nvec3 g110=vec3(gx0.w,gy0.w,gz0.w);\nvec3 g001=vec3(gx1.x,gy1.x,gz1.x);\nvec3 g101=vec3(gx1.y,gy1.y,gz1.y);\nvec3 g011=vec3(gx1.z,gy1.z,gz1.z);\nvec3 g111=vec3(gx1.w,gy1.w,gz1.w);\nvec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));\ng000*=norm0.x;\ng010*=norm0.y;\ng100*=norm0.z;\ng110*=norm0.w;\nvec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));\ng001*=norm1.x;\ng011*=norm1.y;\ng101*=norm1.z;\ng111*=norm1.w;\nfloat n000=dot(g000,Pf0);\nfloat n100=dot(g100,vec3(Pf1.x,Pf0.yz));\nfloat n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));\nfloat n110=dot(g110,vec3(Pf1.xy,Pf0.z));\nfloat n001=dot(g001,vec3(Pf0.xy,Pf1.z));\nfloat n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));\nfloat n011=dot(g011,vec3(Pf0.x,Pf1.yz));\nfloat n111=dot(g111,Pf1);\nvec3 fade_xyz=fade(Pf0);\nvec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);\nvec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);\nfloat n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);\nreturn 2.2*n_xyz;\n}\n\nfloat turbulence( vec3 p ) {\nfloat w=100.0;\nfloat t=-.5;\nfor (float f=1.0 ; f<=10.0 ; f++ ){\nfloat power=pow( 2.0,f );\nt+=abs( pnoise( vec3( power*p ),vec3( 10.0,10.0,10.0 ) )/power );\n}\nreturn t;\n}\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\n#ifdef NORMAL\n\nnoise=10.0*-.10*turbulence( .5*normal+time*1.15 );\n\nfloat b=lowFrequencySpeed*5.0*pnoise( 0.05*position +vec3(time*1.025),vec3( 100.0 ) );\n\nfloat displacement =-1.5*noise+b;\n\nvec3 newPosition=position+normal*displacement;\ngl_Position=viewProjection*finalWorld*vec4( newPosition,1.0 );\nvec4 worldPos=finalWorld*vec4(newPosition,1.0);\nvPositionW=vec3(worldPos);\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}";
BABYLON.Effect.ShadersStore['lavaPixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nvarying vec3 vPositionW;\n\nuniform float time;\nuniform float speed;\nuniform float movingSpeed;\nuniform vec3 fogColor;\nuniform sampler2D noiseTexture;\nuniform float fogDensity;\n\nvarying float noise;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0]\n#include<__decl__lightFragment>[1]\n#include<__decl__lightFragment>[2]\n#include<__decl__lightFragment>[3]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nfloat random( vec3 scale,float seed ){\nreturn fract( sin( dot( gl_FragCoord.xyz+seed,scale ) )*43758.5453+seed ) ;\n}\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\n\nvec4 noiseTex=texture2D( noiseTexture,vDiffuseUV );\nvec2 T1=vDiffuseUV+vec2( 1.5,-1.5 )*time*0.02;\nvec2 T2=vDiffuseUV+vec2( -0.5,2.0 )*time*0.01*speed;\nT1.x+=noiseTex.x*2.0;\nT1.y+=noiseTex.y*2.0;\nT2.x-=noiseTex.y*0.2+time*0.001*movingSpeed;\nT2.y+=noiseTex.z*0.2+time*0.002*movingSpeed;\nfloat p=texture2D( noiseTexture,T1*3.0 ).a;\nvec4 lavaColor=texture2D( diffuseSampler,T2*4.0);\nvec4 temp=lavaColor*( vec4( p,p,p,p )*2. )+( lavaColor*lavaColor-0.1 );\nbaseColor=temp;\nfloat depth=gl_FragCoord.z*4.0;\nconst float LOG2=1.442695;\nfloat fogFactor=exp2(-fogDensity*fogDensity*depth*depth*LOG2 );\nfogFactor=1.0-clamp( fogFactor,0.0,1.0 );\nbaseColor=mix( baseColor,vec4( fogColor,baseColor.w ),fogFactor );\ndiffuseColor=baseColor.rgb;\n\n\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n#ifdef UNLIT\nvec3 diffuseBase=vec3(1.,1.,1.);\n#else\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#include<lightFragment>[0]\n#include<lightFragment>[1]\n#include<lightFragment>[2]\n#include<lightFragment>[3]\n#endif\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var NormalMaterialDefines = /** @class */ (function (_super) {
        __extends(NormalMaterialDefines, _super);
        function NormalMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.DIFFUSE = false;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.LIGHT0 = false;
            _this.LIGHT1 = false;
            _this.LIGHT2 = false;
            _this.LIGHT3 = false;
            _this.SPOTLIGHT0 = false;
            _this.SPOTLIGHT1 = false;
            _this.SPOTLIGHT2 = false;
            _this.SPOTLIGHT3 = false;
            _this.HEMILIGHT0 = false;
            _this.HEMILIGHT1 = false;
            _this.HEMILIGHT2 = false;
            _this.HEMILIGHT3 = false;
            _this.DIRLIGHT0 = false;
            _this.DIRLIGHT1 = false;
            _this.DIRLIGHT2 = false;
            _this.DIRLIGHT3 = false;
            _this.POINTLIGHT0 = false;
            _this.POINTLIGHT1 = false;
            _this.POINTLIGHT2 = false;
            _this.POINTLIGHT3 = false;
            _this.SHADOW0 = false;
            _this.SHADOW1 = false;
            _this.SHADOW2 = false;
            _this.SHADOW3 = false;
            _this.SHADOWS = false;
            _this.SHADOWESM0 = false;
            _this.SHADOWESM1 = false;
            _this.SHADOWESM2 = false;
            _this.SHADOWESM3 = false;
            _this.SHADOWPOISSON0 = false;
            _this.SHADOWPOISSON1 = false;
            _this.SHADOWPOISSON2 = false;
            _this.SHADOWPOISSON3 = false;
            _this.SHADOWPCF0 = false;
            _this.SHADOWPCF1 = false;
            _this.SHADOWPCF2 = false;
            _this.SHADOWPCF3 = false;
            _this.SHADOWPCSS0 = false;
            _this.SHADOWPCSS1 = false;
            _this.SHADOWPCSS2 = false;
            _this.SHADOWPCSS3 = false;
            _this.NORMAL = false;
            _this.UV1 = false;
            _this.UV2 = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.rebuild();
            return _this;
        }
        return NormalMaterialDefines;
    }(BABYLON.MaterialDefines));
    var NormalMaterial = /** @class */ (function (_super) {
        __extends(NormalMaterial, _super);
        function NormalMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            _this._disableLighting = false;
            _this._maxSimultaneousLights = 4;
            return _this;
        }
        NormalMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0);
        };
        NormalMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        NormalMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        // Methods
        NormalMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new NormalMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Textures
            if (defines._areTexturesDirty) {
                defines._needUVs = false;
                if (scene.texturesEnabled) {
                    if (this._diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                        if (!this._diffuseTexture.isReady()) {
                            return false;
                        }
                        else {
                            defines._needUVs = true;
                            defines.DIFFUSE = true;
                        }
                    }
                }
            }
            // Misc.
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            // Lights
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);
            // Values that need to be evaluated on every frame
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.UV2) {
                    attribs.push(BABYLON.VertexBuffer.UV2Kind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                var shaderName = "normal";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vDiffuseInfos",
                    "mBones",
                    "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4", "diffuseMatrix"
                ];
                var samplers = ["diffuseSampler"];
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: 4
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: 4 }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        NormalMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            if (this._mustRebind(scene, effect)) {
                // Textures
                if (this.diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                    this._activeEffect.setTexture("diffuseSampler", this.diffuseTexture);
                    this._activeEffect.setFloat2("vDiffuseInfos", this.diffuseTexture.coordinatesIndex, this.diffuseTexture.level);
                    this._activeEffect.setMatrix("diffuseMatrix", this.diffuseTexture.getTextureMatrix());
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
            // Lights
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._afterBind(mesh, this._activeEffect);
        };
        NormalMaterial.prototype.getAnimatables = function () {
            var results = [];
            if (this.diffuseTexture && this.diffuseTexture.animations && this.diffuseTexture.animations.length > 0) {
                results.push(this.diffuseTexture);
            }
            return results;
        };
        NormalMaterial.prototype.getActiveTextures = function () {
            var activeTextures = _super.prototype.getActiveTextures.call(this);
            if (this._diffuseTexture) {
                activeTextures.push(this._diffuseTexture);
            }
            return activeTextures;
        };
        NormalMaterial.prototype.hasTexture = function (texture) {
            if (_super.prototype.hasTexture.call(this, texture)) {
                return true;
            }
            if (this.diffuseTexture === texture) {
                return true;
            }
            return false;
        };
        NormalMaterial.prototype.dispose = function (forceDisposeEffect) {
            if (this.diffuseTexture) {
                this.diffuseTexture.dispose();
            }
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        NormalMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new NormalMaterial(name, _this.getScene()); }, this);
        };
        NormalMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.NormalMaterial";
            return serializationObject;
        };
        NormalMaterial.prototype.getClassName = function () {
            return "NormalMaterial";
        };
        // Statics
        NormalMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new NormalMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexture")
        ], NormalMaterial.prototype, "_diffuseTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], NormalMaterial.prototype, "diffuseTexture", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], NormalMaterial.prototype, "diffuseColor", void 0);
        __decorate([
            BABYLON.serialize("disableLighting")
        ], NormalMaterial.prototype, "_disableLighting", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], NormalMaterial.prototype, "disableLighting", void 0);
        __decorate([
            BABYLON.serialize("maxSimultaneousLights")
        ], NormalMaterial.prototype, "_maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], NormalMaterial.prototype, "maxSimultaneousLights", void 0);
        return NormalMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.NormalMaterial = NormalMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.normalMaterial.js.map

BABYLON.Effect.ShadersStore['normalVertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['normalPixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0]\n#include<__decl__lightFragment>[1]\n#include<__decl__lightFragment>[2]\n#include<__decl__lightFragment>[3]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\nbaseColor=texture2D(diffuseSampler,vDiffuseUV);\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef NORMAL\nbaseColor=mix(baseColor,vec4(vNormalW,1.0),0.5);\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#include<lightFragment>[0]\n#include<lightFragment>[1]\n#include<lightFragment>[2]\n#include<lightFragment>[3]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var SkyMaterialDefines = /** @class */ (function (_super) {
        __extends(SkyMaterialDefines, _super);
        function SkyMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.rebuild();
            return _this;
        }
        return SkyMaterialDefines;
    }(BABYLON.MaterialDefines));
    var SkyMaterial = /** @class */ (function (_super) {
        __extends(SkyMaterial, _super);
        function SkyMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            // Public members
            _this.luminance = 1.0;
            _this.turbidity = 10.0;
            _this.rayleigh = 2.0;
            _this.mieCoefficient = 0.005;
            _this.mieDirectionalG = 0.8;
            _this.distance = 500;
            _this.inclination = 0.49;
            _this.azimuth = 0.25;
            _this.sunPosition = new BABYLON.Vector3(0, 100, 0);
            _this.useSunPosition = false;
            // Private members
            _this._cameraPosition = BABYLON.Vector3.Zero();
            return _this;
        }
        SkyMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0);
        };
        SkyMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        SkyMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        // Methods
        SkyMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new SkyMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, false, defines);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, false);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                var shaderName = "sky";
                var join = defines.toString();
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, attribs, ["world", "viewProjection", "view",
                    "vFogInfos", "vFogColor", "pointSize", "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4",
                    "luminance", "turbidity", "rayleigh", "mieCoefficient", "mieDirectionalG", "sunPosition",
                    "cameraPosition"
                ], [], join, fallbacks, this.onCompiled, this.onError), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        SkyMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            if (this._mustRebind(scene, effect)) {
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            // Sky
            var camera = scene.activeCamera;
            if (camera) {
                var cameraWorldMatrix = camera.getWorldMatrix();
                this._cameraPosition.x = cameraWorldMatrix.m[12];
                this._cameraPosition.y = cameraWorldMatrix.m[13];
                this._cameraPosition.z = cameraWorldMatrix.m[14];
                this._activeEffect.setVector3("cameraPosition", this._cameraPosition);
            }
            if (this.luminance > 0) {
                this._activeEffect.setFloat("luminance", this.luminance);
            }
            this._activeEffect.setFloat("turbidity", this.turbidity);
            this._activeEffect.setFloat("rayleigh", this.rayleigh);
            this._activeEffect.setFloat("mieCoefficient", this.mieCoefficient);
            this._activeEffect.setFloat("mieDirectionalG", this.mieDirectionalG);
            if (!this.useSunPosition) {
                var theta = Math.PI * (this.inclination - 0.5);
                var phi = 2 * Math.PI * (this.azimuth - 0.5);
                this.sunPosition.x = this.distance * Math.cos(phi);
                this.sunPosition.y = this.distance * Math.sin(phi) * Math.sin(theta);
                this.sunPosition.z = this.distance * Math.sin(phi) * Math.cos(theta);
            }
            this._activeEffect.setVector3("sunPosition", this.sunPosition);
            this._afterBind(mesh, this._activeEffect);
        };
        SkyMaterial.prototype.getAnimatables = function () {
            return [];
        };
        SkyMaterial.prototype.dispose = function (forceDisposeEffect) {
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        SkyMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new SkyMaterial(name, _this.getScene()); }, this);
        };
        SkyMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.SkyMaterial";
            return serializationObject;
        };
        SkyMaterial.prototype.getClassName = function () {
            return "SkyMaterial";
        };
        // Statics
        SkyMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new SkyMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "luminance", void 0);
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "turbidity", void 0);
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "rayleigh", void 0);
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "mieCoefficient", void 0);
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "mieDirectionalG", void 0);
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "distance", void 0);
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "inclination", void 0);
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "azimuth", void 0);
        __decorate([
            BABYLON.serializeAsVector3()
        ], SkyMaterial.prototype, "sunPosition", void 0);
        __decorate([
            BABYLON.serialize()
        ], SkyMaterial.prototype, "useSunPosition", void 0);
        return SkyMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.SkyMaterial = SkyMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.skyMaterial.js.map

BABYLON.Effect.ShadersStore['skyVertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n\nuniform mat4 world;\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\nvoid main(void) {\ngl_Position=viewProjection*world*vec4(position,1.0);\nvec4 worldPos=world*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['skyPixelShader'] = "precision highp float;\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\nuniform vec3 cameraPosition;\nuniform float luminance;\nuniform float turbidity;\nuniform float rayleigh;\nuniform float mieCoefficient;\nuniform float mieDirectionalG;\nuniform vec3 sunPosition;\n\n#include<fogFragmentDeclaration>\n\nconst float e=2.71828182845904523536028747135266249775724709369995957;\nconst float pi=3.141592653589793238462643383279502884197169;\nconst float n=1.0003;\nconst float N=2.545E25;\nconst float pn=0.035;\nconst vec3 lambda=vec3(680E-9,550E-9,450E-9);\nconst vec3 K=vec3(0.686,0.678,0.666);\nconst float v=4.0;\nconst float rayleighZenithLength=8.4E3;\nconst float mieZenithLength=1.25E3;\nconst vec3 up=vec3(0.0,1.0,0.0);\nconst float EE=1000.0;\nconst float sunAngularDiameterCos=0.999956676946448443553574619906976478926848692873900859324;\nconst float cutoffAngle=pi/1.95;\nconst float steepness=1.5;\nvec3 totalRayleigh(vec3 lambda)\n{\nreturn (8.0*pow(pi,3.0)*pow(pow(n,2.0)-1.0,2.0)*(6.0+3.0*pn))/(3.0*N*pow(lambda,vec3(4.0))*(6.0-7.0*pn));\n}\nvec3 simplifiedRayleigh()\n{\nreturn 0.0005/vec3(94,40,18);\n}\nfloat rayleighPhase(float cosTheta)\n{ \nreturn (3.0/(16.0*pi))*(1.0+pow(cosTheta,2.0));\n}\nvec3 totalMie(vec3 lambda,vec3 K,float T)\n{\nfloat c=(0.2*T )*10E-18;\nreturn 0.434*c*pi*pow((2.0*pi)/lambda,vec3(v-2.0))*K;\n}\nfloat hgPhase(float cosTheta,float g)\n{\nreturn (1.0/(4.0*pi))*((1.0-pow(g,2.0))/pow(1.0-2.0*g*cosTheta+pow(g,2.0),1.5));\n}\nfloat sunIntensity(float zenithAngleCos)\n{\nreturn EE*max(0.0,1.0-exp((-(cutoffAngle-acos(zenithAngleCos))/steepness)));\n}\nfloat A=0.15;\nfloat B=0.50;\nfloat C=0.10;\nfloat D=0.20;\nfloat EEE=0.02;\nfloat F=0.30;\nfloat W=1000.0;\nvec3 Uncharted2Tonemap(vec3 x)\n{\nreturn ((x*(A*x+C*B)+D*EEE)/(x*(A*x+B)+D*F))-EEE/F;\n}\nvoid main(void) {\n\n#include<clipPlaneFragment>\n\nfloat sunfade=1.0-clamp(1.0-exp((sunPosition.y/450000.0)),0.0,1.0);\nfloat rayleighCoefficient=rayleigh-(1.0*(1.0-sunfade));\nvec3 sunDirection=normalize(sunPosition);\nfloat sunE=sunIntensity(dot(sunDirection,up));\nvec3 betaR=simplifiedRayleigh()*rayleighCoefficient;\nvec3 betaM=totalMie(lambda,K,turbidity)*mieCoefficient;\nfloat zenithAngle=acos(max(0.0,dot(up,normalize(vPositionW-cameraPosition))));\nfloat sR=rayleighZenithLength/(cos(zenithAngle)+0.15*pow(93.885-((zenithAngle*180.0)/pi),-1.253));\nfloat sM=mieZenithLength/(cos(zenithAngle)+0.15*pow(93.885-((zenithAngle*180.0)/pi),-1.253));\nvec3 Fex=exp(-(betaR*sR+betaM*sM));\nfloat cosTheta=dot(normalize(vPositionW-cameraPosition),sunDirection);\nfloat rPhase=rayleighPhase(cosTheta*0.5+0.5);\nvec3 betaRTheta=betaR*rPhase;\nfloat mPhase=hgPhase(cosTheta,mieDirectionalG);\nvec3 betaMTheta=betaM*mPhase;\nvec3 Lin=pow(sunE*((betaRTheta+betaMTheta)/(betaR+betaM))*(1.0-Fex),vec3(1.5));\nLin*=mix(vec3(1.0),pow(sunE*((betaRTheta+betaMTheta)/(betaR+betaM))*Fex,vec3(1.0/2.0)),clamp(pow(1.0-dot(up,sunDirection),5.0),0.0,1.0));\nvec3 direction=normalize(vPositionW-cameraPosition);\nfloat theta=acos(direction.y);\nfloat phi=atan(direction.z,direction.x);\nvec2 uv=vec2(phi,theta)/vec2(2.0*pi,pi)+vec2(0.5,0.0);\nvec3 L0=vec3(0.1)*Fex;\nfloat sundisk=smoothstep(sunAngularDiameterCos,sunAngularDiameterCos+0.00002,cosTheta);\nL0+=(sunE*19000.0*Fex)*sundisk;\nvec3 whiteScale=1.0/Uncharted2Tonemap(vec3(W));\nvec3 texColor=(Lin+L0); \ntexColor*=0.04 ;\ntexColor+=vec3(0.0,0.001,0.0025)*0.3;\nfloat g_fMaxLuminance=1.0;\nfloat fLumScaled=0.1/luminance; \nfloat fLumCompressed=(fLumScaled*(1.0+(fLumScaled/(g_fMaxLuminance*g_fMaxLuminance))))/(1.0+fLumScaled); \nfloat ExposureBias=fLumCompressed;\nvec3 curr=Uncharted2Tonemap((log2(2.0/pow(luminance,4.0)))*texColor);\n\n\n\nvec3 retColor=curr*whiteScale;\n\n\nfloat alpha=1.0;\n#ifdef VERTEXCOLOR\nretColor.rgb*=vColor.rgb;\n#endif\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n\nvec4 color=clamp(vec4(retColor.rgb,alpha),0.0,1.0);\n\n#include<fogFragment>\ngl_FragColor=color;\n}\n";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var TerrainMaterialDefines = /** @class */ (function (_super) {
        __extends(TerrainMaterialDefines, _super);
        function TerrainMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.DIFFUSE = false;
            _this.BUMP = false;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.SPECULARTERM = false;
            _this.NORMAL = false;
            _this.UV1 = false;
            _this.UV2 = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.rebuild();
            return _this;
        }
        return TerrainMaterialDefines;
    }(BABYLON.MaterialDefines));
    var TerrainMaterial = /** @class */ (function (_super) {
        __extends(TerrainMaterial, _super);
        function TerrainMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            _this.specularColor = new BABYLON.Color3(0, 0, 0);
            _this.specularPower = 64;
            _this._disableLighting = false;
            _this._maxSimultaneousLights = 4;
            return _this;
        }
        TerrainMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0);
        };
        TerrainMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        TerrainMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        // Methods
        TerrainMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new TerrainMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Textures
            if (scene.texturesEnabled) {
                if (this.mixTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                    if (!this.mixTexture.isReady()) {
                        return false;
                    }
                    else {
                        defines._needUVs = true;
                        defines.DIFFUSE = true;
                    }
                }
                if ((this.bumpTexture1 || this.bumpTexture2 || this.bumpTexture3) && BABYLON.StandardMaterial.BumpTextureEnabled) {
                    defines._needUVs = true;
                    defines._needNormals = true;
                    defines.BUMP = true;
                }
            }
            // Misc.
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            // Lights
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);
            // Values that need to be evaluated on every frame
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.UV2) {
                    attribs.push(BABYLON.VertexBuffer.UV2Kind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                // Legacy browser patch
                var shaderName = "terrain";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor", "vSpecularColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vTextureInfos",
                    "mBones",
                    "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4", "textureMatrix",
                    "diffuse1Infos", "diffuse2Infos", "diffuse3Infos"
                ];
                var samplers = ["textureSampler", "diffuse1Sampler", "diffuse2Sampler", "diffuse3Sampler",
                    "bump1Sampler", "bump2Sampler", "bump3Sampler"
                ];
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: this.maxSimultaneousLights
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this.maxSimultaneousLights }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        TerrainMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            if (this._mustRebind(scene, effect)) {
                // Textures
                if (this.mixTexture) {
                    this._activeEffect.setTexture("textureSampler", this._mixTexture);
                    this._activeEffect.setFloat2("vTextureInfos", this._mixTexture.coordinatesIndex, this._mixTexture.level);
                    this._activeEffect.setMatrix("textureMatrix", this._mixTexture.getTextureMatrix());
                    if (BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                        if (this._diffuseTexture1) {
                            this._activeEffect.setTexture("diffuse1Sampler", this._diffuseTexture1);
                            this._activeEffect.setFloat2("diffuse1Infos", this._diffuseTexture1.uScale, this._diffuseTexture1.vScale);
                        }
                        if (this._diffuseTexture2) {
                            this._activeEffect.setTexture("diffuse2Sampler", this._diffuseTexture2);
                            this._activeEffect.setFloat2("diffuse2Infos", this._diffuseTexture2.uScale, this._diffuseTexture2.vScale);
                        }
                        if (this._diffuseTexture3) {
                            this._activeEffect.setTexture("diffuse3Sampler", this._diffuseTexture3);
                            this._activeEffect.setFloat2("diffuse3Infos", this._diffuseTexture3.uScale, this._diffuseTexture3.vScale);
                        }
                    }
                    if (BABYLON.StandardMaterial.BumpTextureEnabled && scene.getEngine().getCaps().standardDerivatives) {
                        if (this._bumpTexture1) {
                            this._activeEffect.setTexture("bump1Sampler", this._bumpTexture1);
                        }
                        if (this._bumpTexture2) {
                            this._activeEffect.setTexture("bump2Sampler", this._bumpTexture2);
                        }
                        if (this._bumpTexture3) {
                            this._activeEffect.setTexture("bump3Sampler", this._bumpTexture3);
                        }
                    }
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
            if (defines.SPECULARTERM) {
                this._activeEffect.setColor4("vSpecularColor", this.specularColor, this.specularPower);
            }
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._afterBind(mesh, this._activeEffect);
        };
        TerrainMaterial.prototype.getAnimatables = function () {
            var results = [];
            if (this.mixTexture && this.mixTexture.animations && this.mixTexture.animations.length > 0) {
                results.push(this.mixTexture);
            }
            return results;
        };
        TerrainMaterial.prototype.getActiveTextures = function () {
            var activeTextures = _super.prototype.getActiveTextures.call(this);
            if (this._mixTexture) {
                activeTextures.push(this._mixTexture);
            }
            if (this._diffuseTexture1) {
                activeTextures.push(this._diffuseTexture1);
            }
            if (this._diffuseTexture2) {
                activeTextures.push(this._diffuseTexture2);
            }
            if (this._diffuseTexture3) {
                activeTextures.push(this._diffuseTexture3);
            }
            if (this._bumpTexture1) {
                activeTextures.push(this._bumpTexture1);
            }
            if (this._bumpTexture2) {
                activeTextures.push(this._bumpTexture2);
            }
            if (this._bumpTexture3) {
                activeTextures.push(this._bumpTexture3);
            }
            return activeTextures;
        };
        TerrainMaterial.prototype.hasTexture = function (texture) {
            if (_super.prototype.hasTexture.call(this, texture)) {
                return true;
            }
            if (this._mixTexture === texture) {
                return true;
            }
            if (this._diffuseTexture1 === texture) {
                return true;
            }
            if (this._diffuseTexture2 === texture) {
                return true;
            }
            if (this._diffuseTexture3 === texture) {
                return true;
            }
            if (this._bumpTexture1 === texture) {
                return true;
            }
            if (this._bumpTexture2 === texture) {
                return true;
            }
            if (this._bumpTexture3 === texture) {
                return true;
            }
            return false;
        };
        TerrainMaterial.prototype.dispose = function (forceDisposeEffect) {
            if (this.mixTexture) {
                this.mixTexture.dispose();
            }
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        TerrainMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new TerrainMaterial(name, _this.getScene()); }, this);
        };
        TerrainMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.TerrainMaterial";
            return serializationObject;
        };
        TerrainMaterial.prototype.getClassName = function () {
            return "TerrainMaterial";
        };
        // Statics
        TerrainMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new TerrainMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        __decorate([
            BABYLON.serializeAsTexture("mixTexture")
        ], TerrainMaterial.prototype, "_mixTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TerrainMaterial.prototype, "mixTexture", void 0);
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexture1")
        ], TerrainMaterial.prototype, "_diffuseTexture1", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TerrainMaterial.prototype, "diffuseTexture1", void 0);
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexture2")
        ], TerrainMaterial.prototype, "_diffuseTexture2", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TerrainMaterial.prototype, "diffuseTexture2", void 0);
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexture3")
        ], TerrainMaterial.prototype, "_diffuseTexture3", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TerrainMaterial.prototype, "diffuseTexture3", void 0);
        __decorate([
            BABYLON.serializeAsTexture("bumpTexture1")
        ], TerrainMaterial.prototype, "_bumpTexture1", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TerrainMaterial.prototype, "bumpTexture1", void 0);
        __decorate([
            BABYLON.serializeAsTexture("bumpTexture2")
        ], TerrainMaterial.prototype, "_bumpTexture2", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TerrainMaterial.prototype, "bumpTexture2", void 0);
        __decorate([
            BABYLON.serializeAsTexture("bumpTexture3")
        ], TerrainMaterial.prototype, "_bumpTexture3", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TerrainMaterial.prototype, "bumpTexture3", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], TerrainMaterial.prototype, "diffuseColor", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], TerrainMaterial.prototype, "specularColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], TerrainMaterial.prototype, "specularPower", void 0);
        __decorate([
            BABYLON.serialize("disableLighting")
        ], TerrainMaterial.prototype, "_disableLighting", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], TerrainMaterial.prototype, "disableLighting", void 0);
        __decorate([
            BABYLON.serialize("maxSimultaneousLights")
        ], TerrainMaterial.prototype, "_maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], TerrainMaterial.prototype, "maxSimultaneousLights", void 0);
        return TerrainMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.TerrainMaterial = TerrainMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.terrainMaterial.js.map

BABYLON.Effect.ShadersStore['terrainVertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vTextureUV;\nuniform mat4 textureMatrix;\nuniform vec2 vTextureInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vTextureInfos.x == 0.)\n{\nvTextureUV=vec2(textureMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvTextureUV=vec2(textureMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['terrainPixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n#ifdef SPECULARTERM\nuniform vec4 vSpecularColor;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n\n#ifdef DIFFUSE\nvarying vec2 vTextureUV;\nuniform sampler2D textureSampler;\nuniform vec2 vTextureInfos;\nuniform sampler2D diffuse1Sampler;\nuniform sampler2D diffuse2Sampler;\nuniform sampler2D diffuse3Sampler;\nuniform vec2 diffuse1Infos;\nuniform vec2 diffuse2Infos;\nuniform vec2 diffuse3Infos;\n#endif\n#ifdef BUMP\nuniform sampler2D bump1Sampler;\nuniform sampler2D bump2Sampler;\nuniform sampler2D bump3Sampler;\n#endif\n\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\n\n#ifdef BUMP\n#extension GL_OES_standard_derivatives : enable\n\nmat3 cotangent_frame(vec3 normal,vec3 p,vec2 uv)\n{\n\nvec3 dp1=dFdx(p);\nvec3 dp2=dFdy(p);\nvec2 duv1=dFdx(uv);\nvec2 duv2=dFdy(uv);\n\nvec3 dp2perp=cross(dp2,normal);\nvec3 dp1perp=cross(normal,dp1);\nvec3 tangent=dp2perp*duv1.x+dp1perp*duv2.x;\nvec3 binormal=dp2perp*duv1.y+dp1perp*duv2.y;\n\nfloat invmax=inversesqrt(max(dot(tangent,tangent),dot(binormal,binormal)));\nreturn mat3(tangent*invmax,binormal*invmax,normal);\n}\nvec3 perturbNormal(vec3 viewDir,vec3 mixColor)\n{ \nvec3 bump1Color=texture2D(bump1Sampler,vTextureUV*diffuse1Infos).xyz;\nvec3 bump2Color=texture2D(bump2Sampler,vTextureUV*diffuse2Infos).xyz;\nvec3 bump3Color=texture2D(bump3Sampler,vTextureUV*diffuse3Infos).xyz;\nbump1Color.rgb*=mixColor.r;\nbump2Color.rgb=mix(bump1Color.rgb,bump2Color.rgb,mixColor.g);\nvec3 map=mix(bump2Color.rgb,bump3Color.rgb,mixColor.b);\nmap=map*255./127.-128./127.;\nmat3 TBN=cotangent_frame(vNormalW*vTextureInfos.y,-viewDir,vTextureUV);\nreturn normalize(TBN*map);\n}\n#endif\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n#ifdef SPECULARTERM\nfloat glossiness=vSpecularColor.a;\nvec3 specularColor=vSpecularColor.rgb;\n#else\nfloat glossiness=0.;\n#endif\n\nfloat alpha=vDiffuseColor.a;\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n#ifdef DIFFUSE\nbaseColor=texture2D(textureSampler,vTextureUV);\n#if defined(BUMP) && defined(DIFFUSE)\nnormalW=perturbNormal(viewDirectionW,baseColor.rgb);\n#endif\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vTextureInfos.y;\nvec4 diffuse1Color=texture2D(diffuse1Sampler,vTextureUV*diffuse1Infos);\nvec4 diffuse2Color=texture2D(diffuse2Sampler,vTextureUV*diffuse2Infos);\nvec4 diffuse3Color=texture2D(diffuse3Sampler,vTextureUV*diffuse3Infos);\ndiffuse1Color.rgb*=baseColor.r;\ndiffuse2Color.rgb=mix(diffuse1Color.rgb,diffuse2Color.rgb,baseColor.g);\nbaseColor.rgb=mix(diffuse2Color.rgb,diffuse3Color.rgb,baseColor.b);\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\n#ifdef SPECULARTERM\nvec3 specularBase=vec3(0.,0.,0.);\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n#ifdef SPECULARTERM\nvec3 finalSpecular=specularBase*specularColor;\n#else\nvec3 finalSpecular=vec3(0.0);\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor*baseColor.rgb,0.0,1.0);\n\nvec4 color=vec4(finalDiffuse+finalSpecular,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}\n";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var TriPlanarMaterialDefines = /** @class */ (function (_super) {
        __extends(TriPlanarMaterialDefines, _super);
        function TriPlanarMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.DIFFUSEX = false;
            _this.DIFFUSEY = false;
            _this.DIFFUSEZ = false;
            _this.BUMPX = false;
            _this.BUMPY = false;
            _this.BUMPZ = false;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.SPECULARTERM = false;
            _this.NORMAL = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.rebuild();
            return _this;
        }
        return TriPlanarMaterialDefines;
    }(BABYLON.MaterialDefines));
    var TriPlanarMaterial = /** @class */ (function (_super) {
        __extends(TriPlanarMaterial, _super);
        function TriPlanarMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this.tileSize = 1;
            _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            _this.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            _this.specularPower = 64;
            _this._disableLighting = false;
            _this._maxSimultaneousLights = 4;
            return _this;
        }
        TriPlanarMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0);
        };
        TriPlanarMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        TriPlanarMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        // Methods
        TriPlanarMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new TriPlanarMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Textures
            if (defines._areTexturesDirty) {
                if (scene.texturesEnabled) {
                    if (BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                        var textures = [this.diffuseTextureX, this.diffuseTextureY, this.diffuseTextureZ];
                        var textureDefines = ["DIFFUSEX", "DIFFUSEY", "DIFFUSEZ"];
                        for (var i = 0; i < textures.length; i++) {
                            if (textures[i]) {
                                if (!textures[i].isReady()) {
                                    return false;
                                }
                                else {
                                    defines[textureDefines[i]] = true;
                                }
                            }
                        }
                    }
                    if (BABYLON.StandardMaterial.BumpTextureEnabled) {
                        var textures = [this.normalTextureX, this.normalTextureY, this.normalTextureZ];
                        var textureDefines = ["BUMPX", "BUMPY", "BUMPZ"];
                        for (var i = 0; i < textures.length; i++) {
                            if (textures[i]) {
                                if (!textures[i].isReady()) {
                                    return false;
                                }
                                else {
                                    defines[textureDefines[i]] = true;
                                }
                            }
                        }
                    }
                }
            }
            // Misc.
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            // Lights
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);
            // Values that need to be evaluated on every frame
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                // Legacy browser patch
                var shaderName = "triplanar";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor", "vSpecularColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "mBones",
                    "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4",
                    "tileSize"
                ];
                var samplers = ["diffuseSamplerX", "diffuseSamplerY", "diffuseSamplerZ",
                    "normalSamplerX", "normalSamplerY", "normalSamplerZ"
                ];
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: this.maxSimultaneousLights
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this.maxSimultaneousLights }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        TriPlanarMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            this._activeEffect.setFloat("tileSize", this.tileSize);
            if (scene.getCachedMaterial() !== this) {
                // Textures
                if (this.diffuseTextureX) {
                    this._activeEffect.setTexture("diffuseSamplerX", this.diffuseTextureX);
                }
                if (this.diffuseTextureY) {
                    this._activeEffect.setTexture("diffuseSamplerY", this.diffuseTextureY);
                }
                if (this.diffuseTextureZ) {
                    this._activeEffect.setTexture("diffuseSamplerZ", this.diffuseTextureZ);
                }
                if (this.normalTextureX) {
                    this._activeEffect.setTexture("normalSamplerX", this.normalTextureX);
                }
                if (this.normalTextureY) {
                    this._activeEffect.setTexture("normalSamplerY", this.normalTextureY);
                }
                if (this.normalTextureZ) {
                    this._activeEffect.setTexture("normalSamplerZ", this.normalTextureZ);
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
            if (defines.SPECULARTERM) {
                this._activeEffect.setColor4("vSpecularColor", this.specularColor, this.specularPower);
            }
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._afterBind(mesh, this._activeEffect);
        };
        TriPlanarMaterial.prototype.getAnimatables = function () {
            var results = [];
            if (this.mixTexture && this.mixTexture.animations && this.mixTexture.animations.length > 0) {
                results.push(this.mixTexture);
            }
            return results;
        };
        TriPlanarMaterial.prototype.getActiveTextures = function () {
            var activeTextures = _super.prototype.getActiveTextures.call(this);
            if (this._diffuseTextureX) {
                activeTextures.push(this._diffuseTextureX);
            }
            if (this._diffuseTextureY) {
                activeTextures.push(this._diffuseTextureY);
            }
            if (this._diffuseTextureZ) {
                activeTextures.push(this._diffuseTextureZ);
            }
            if (this._normalTextureX) {
                activeTextures.push(this._normalTextureX);
            }
            if (this._normalTextureY) {
                activeTextures.push(this._normalTextureY);
            }
            if (this._normalTextureZ) {
                activeTextures.push(this._normalTextureZ);
            }
            return activeTextures;
        };
        TriPlanarMaterial.prototype.hasTexture = function (texture) {
            if (_super.prototype.hasTexture.call(this, texture)) {
                return true;
            }
            if (this._diffuseTextureX === texture) {
                return true;
            }
            if (this._diffuseTextureY === texture) {
                return true;
            }
            if (this._diffuseTextureZ === texture) {
                return true;
            }
            if (this._normalTextureX === texture) {
                return true;
            }
            if (this._normalTextureY === texture) {
                return true;
            }
            if (this._normalTextureZ === texture) {
                return true;
            }
            return false;
        };
        TriPlanarMaterial.prototype.dispose = function (forceDisposeEffect) {
            if (this.mixTexture) {
                this.mixTexture.dispose();
            }
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        TriPlanarMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new TriPlanarMaterial(name, _this.getScene()); }, this);
        };
        TriPlanarMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.TriPlanarMaterial";
            return serializationObject;
        };
        TriPlanarMaterial.prototype.getClassName = function () {
            return "TriPlanarMaterial";
        };
        // Statics
        TriPlanarMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new TriPlanarMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        __decorate([
            BABYLON.serializeAsTexture()
        ], TriPlanarMaterial.prototype, "mixTexture", void 0);
        __decorate([
            BABYLON.serializeAsTexture("diffuseTextureX")
        ], TriPlanarMaterial.prototype, "_diffuseTextureX", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TriPlanarMaterial.prototype, "diffuseTextureX", void 0);
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexturY")
        ], TriPlanarMaterial.prototype, "_diffuseTextureY", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TriPlanarMaterial.prototype, "diffuseTextureY", void 0);
        __decorate([
            BABYLON.serializeAsTexture("diffuseTextureZ")
        ], TriPlanarMaterial.prototype, "_diffuseTextureZ", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TriPlanarMaterial.prototype, "diffuseTextureZ", void 0);
        __decorate([
            BABYLON.serializeAsTexture("normalTextureX")
        ], TriPlanarMaterial.prototype, "_normalTextureX", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TriPlanarMaterial.prototype, "normalTextureX", void 0);
        __decorate([
            BABYLON.serializeAsTexture("normalTextureY")
        ], TriPlanarMaterial.prototype, "_normalTextureY", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TriPlanarMaterial.prototype, "normalTextureY", void 0);
        __decorate([
            BABYLON.serializeAsTexture("normalTextureZ")
        ], TriPlanarMaterial.prototype, "_normalTextureZ", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], TriPlanarMaterial.prototype, "normalTextureZ", void 0);
        __decorate([
            BABYLON.serialize()
        ], TriPlanarMaterial.prototype, "tileSize", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], TriPlanarMaterial.prototype, "diffuseColor", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], TriPlanarMaterial.prototype, "specularColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], TriPlanarMaterial.prototype, "specularPower", void 0);
        __decorate([
            BABYLON.serialize("disableLighting")
        ], TriPlanarMaterial.prototype, "_disableLighting", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], TriPlanarMaterial.prototype, "disableLighting", void 0);
        __decorate([
            BABYLON.serialize("maxSimultaneousLights")
        ], TriPlanarMaterial.prototype, "_maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], TriPlanarMaterial.prototype, "maxSimultaneousLights", void 0);
        return TriPlanarMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.TriPlanarMaterial = TriPlanarMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.triPlanarMaterial.js.map

BABYLON.Effect.ShadersStore['triplanarVertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSEX\nvarying vec2 vTextureUVX;\n#endif\n#ifdef DIFFUSEY\nvarying vec2 vTextureUVY;\n#endif\n#ifdef DIFFUSEZ\nvarying vec2 vTextureUVZ;\n#endif\nuniform float tileSize;\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying mat3 tangentSpace;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void)\n{\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef DIFFUSEX\nvTextureUVX=worldPos.zy/tileSize;\n#endif\n#ifdef DIFFUSEY\nvTextureUVY=worldPos.xz/tileSize;\n#endif\n#ifdef DIFFUSEZ\nvTextureUVZ=worldPos.xy/tileSize;\n#endif\n#ifdef NORMAL\n\nvec3 xtan=vec3(0,0,1);\nvec3 xbin=vec3(0,1,0);\nvec3 ytan=vec3(1,0,0);\nvec3 ybin=vec3(0,0,1);\nvec3 ztan=vec3(1,0,0);\nvec3 zbin=vec3(0,1,0);\nvec3 normalizedNormal=normalize(normal);\nnormalizedNormal*=normalizedNormal;\nvec3 worldBinormal=normalize(xbin*normalizedNormal.x+ybin*normalizedNormal.y+zbin*normalizedNormal.z);\nvec3 worldTangent=normalize(xtan*normalizedNormal.x+ytan*normalizedNormal.y+ztan*normalizedNormal.z);\nworldTangent=(world*vec4(worldTangent,1.0)).xyz;\nworldBinormal=(world*vec4(worldBinormal,1.0)).xyz;\nvec3 worldNormal=normalize(cross(worldTangent,worldBinormal));\ntangentSpace[0]=worldTangent;\ntangentSpace[1]=worldBinormal;\ntangentSpace[2]=worldNormal;\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['triplanarPixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n#ifdef SPECULARTERM\nuniform vec4 vSpecularColor;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n\n#ifdef DIFFUSEX\nvarying vec2 vTextureUVX;\nuniform sampler2D diffuseSamplerX;\n#ifdef BUMPX\nuniform sampler2D normalSamplerX;\n#endif\n#endif\n#ifdef DIFFUSEY\nvarying vec2 vTextureUVY;\nuniform sampler2D diffuseSamplerY;\n#ifdef BUMPY\nuniform sampler2D normalSamplerY;\n#endif\n#endif\n#ifdef DIFFUSEZ\nvarying vec2 vTextureUVZ;\nuniform sampler2D diffuseSamplerZ;\n#ifdef BUMPZ\nuniform sampler2D normalSamplerZ;\n#endif\n#endif\n#ifdef NORMAL\nvarying mat3 tangentSpace;\n#endif\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n#include<clipPlaneFragmentDeclaration>\n#include<fogFragmentDeclaration>\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(0.,0.,0.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n\n#ifdef NORMAL\nvec3 normalW=tangentSpace[2];\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\nvec4 baseNormal=vec4(0.0,0.0,0.0,1.0);\nnormalW*=normalW;\n#ifdef DIFFUSEX\nbaseColor+=texture2D(diffuseSamplerX,vTextureUVX)*normalW.x;\n#ifdef BUMPX\nbaseNormal+=texture2D(normalSamplerX,vTextureUVX)*normalW.x;\n#endif\n#endif\n#ifdef DIFFUSEY\nbaseColor+=texture2D(diffuseSamplerY,vTextureUVY)*normalW.y;\n#ifdef BUMPY\nbaseNormal+=texture2D(normalSamplerY,vTextureUVY)*normalW.y;\n#endif\n#endif\n#ifdef DIFFUSEZ\nbaseColor+=texture2D(diffuseSamplerZ,vTextureUVZ)*normalW.z;\n#ifdef BUMPZ\nbaseNormal+=texture2D(normalSamplerZ,vTextureUVZ)*normalW.z;\n#endif\n#endif\n#ifdef NORMAL\nnormalW=normalize((2.0*baseNormal.xyz-1.0)*tangentSpace);\n#endif\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\n#ifdef SPECULARTERM\nfloat glossiness=vSpecularColor.a;\nvec3 specularBase=vec3(0.,0.,0.);\nvec3 specularColor=vSpecularColor.rgb;\n#else\nfloat glossiness=0.;\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n#ifdef SPECULARTERM\nvec3 finalSpecular=specularBase*specularColor;\n#else\nvec3 finalSpecular=vec3(0.0);\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse+finalSpecular,alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}\n";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var WaterMaterialDefines = /** @class */ (function (_super) {
        __extends(WaterMaterialDefines, _super);
        function WaterMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.BUMP = false;
            _this.REFLECTION = false;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.NORMAL = false;
            _this.UV1 = false;
            _this.UV2 = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.SPECULARTERM = false;
            _this.LOGARITHMICDEPTH = false;
            _this.FRESNELSEPARATE = false;
            _this.BUMPSUPERIMPOSE = false;
            _this.BUMPAFFECTSREFLECTION = false;
            _this.rebuild();
            return _this;
        }
        return WaterMaterialDefines;
    }(BABYLON.MaterialDefines));
    var WaterMaterial = /** @class */ (function (_super) {
        __extends(WaterMaterial, _super);
        /**
        * Constructor
        */
        function WaterMaterial(name, scene, renderTargetSize) {
            if (renderTargetSize === void 0) { renderTargetSize = new BABYLON.Vector2(512, 512); }
            var _this = _super.call(this, name, scene) || this;
            _this.renderTargetSize = renderTargetSize;
            _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            _this.specularColor = new BABYLON.Color3(0, 0, 0);
            _this.specularPower = 64;
            _this._disableLighting = false;
            _this._maxSimultaneousLights = 4;
            /**
            * @param {number}: Represents the wind force
            */
            _this.windForce = 6;
            /**
            * @param {Vector2}: The direction of the wind in the plane (X, Z)
            */
            _this.windDirection = new BABYLON.Vector2(0, 1);
            /**
            * @param {number}: Wave height, represents the height of the waves
            */
            _this.waveHeight = 0.4;
            /**
            * @param {number}: Bump height, represents the bump height related to the bump map
            */
            _this.bumpHeight = 0.4;
            /**
             * @param {boolean}: Add a smaller moving bump to less steady waves.
             */
            _this._bumpSuperimpose = false;
            /**
             * @param {boolean}: Color refraction and reflection differently with .waterColor2 and .colorBlendFactor2. Non-linear (physically correct) fresnel.
             */
            _this._fresnelSeparate = false;
            /**
             * @param {boolean}: bump Waves modify the reflection.
             */
            _this._bumpAffectsReflection = false;
            /**
            * @param {number}: The water color blended with the refraction (near)
            */
            _this.waterColor = new BABYLON.Color3(0.1, 0.1, 0.6);
            /**
            * @param {number}: The blend factor related to the water color
            */
            _this.colorBlendFactor = 0.2;
            /**
             * @param {number}: The water color blended with the reflection (far)
             */
            _this.waterColor2 = new BABYLON.Color3(0.1, 0.1, 0.6);
            /**
             * @param {number}: The blend factor related to the water color (reflection, far)
             */
            _this.colorBlendFactor2 = 0.2;
            /**
            * @param {number}: Represents the maximum length of a wave
            */
            _this.waveLength = 0.1;
            /**
            * @param {number}: Defines the waves speed
            */
            _this.waveSpeed = 1.0;
            _this._renderTargets = new BABYLON.SmartArray(16);
            /*
            * Private members
            */
            _this._mesh = null;
            _this._reflectionTransform = BABYLON.Matrix.Zero();
            _this._lastTime = 0;
            _this._lastDeltaTime = 0;
            _this._createRenderTargets(scene, renderTargetSize);
            // Create render targets
            _this.getRenderTargetTextures = function () {
                _this._renderTargets.reset();
                _this._renderTargets.push(_this._reflectionRTT);
                _this._renderTargets.push(_this._refractionRTT);
                return _this._renderTargets;
            };
            return _this;
        }
        Object.defineProperty(WaterMaterial.prototype, "hasRenderTargetTextures", {
            /**
             * Gets a boolean indicating that current material needs to register RTT
             */
            get: function () {
                return true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WaterMaterial.prototype, "useLogarithmicDepth", {
            get: function () {
                return this._useLogarithmicDepth;
            },
            set: function (value) {
                this._useLogarithmicDepth = value && this.getScene().getEngine().getCaps().fragmentDepthSupported;
                this._markAllSubMeshesAsMiscDirty();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WaterMaterial.prototype, "refractionTexture", {
            // Get / Set
            get: function () {
                return this._refractionRTT;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WaterMaterial.prototype, "reflectionTexture", {
            get: function () {
                return this._reflectionRTT;
            },
            enumerable: true,
            configurable: true
        });
        // Methods
        WaterMaterial.prototype.addToRenderList = function (node) {
            if (this._refractionRTT && this._refractionRTT.renderList) {
                this._refractionRTT.renderList.push(node);
            }
            if (this._reflectionRTT && this._reflectionRTT.renderList) {
                this._reflectionRTT.renderList.push(node);
            }
        };
        WaterMaterial.prototype.enableRenderTargets = function (enable) {
            var refreshRate = enable ? 1 : 0;
            if (this._refractionRTT) {
                this._refractionRTT.refreshRate = refreshRate;
            }
            if (this._reflectionRTT) {
                this._reflectionRTT.refreshRate = refreshRate;
            }
        };
        WaterMaterial.prototype.getRenderList = function () {
            return this._refractionRTT ? this._refractionRTT.renderList : [];
        };
        Object.defineProperty(WaterMaterial.prototype, "renderTargetsEnabled", {
            get: function () {
                return !(this._refractionRTT && this._refractionRTT.refreshRate === 0);
            },
            enumerable: true,
            configurable: true
        });
        WaterMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0);
        };
        WaterMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        WaterMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        WaterMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new WaterMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Textures
            if (defines._areTexturesDirty) {
                defines._needUVs = false;
                if (scene.texturesEnabled) {
                    if (this.bumpTexture && BABYLON.StandardMaterial.BumpTextureEnabled) {
                        if (!this.bumpTexture.isReady()) {
                            return false;
                        }
                        else {
                            defines._needUVs = true;
                            defines.BUMP = true;
                        }
                    }
                    if (BABYLON.StandardMaterial.ReflectionTextureEnabled) {
                        defines.REFLECTION = true;
                    }
                }
            }
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, this._useLogarithmicDepth, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            if (defines._areMiscDirty) {
                if (this._fresnelSeparate) {
                    defines.FRESNELSEPARATE = true;
                }
                if (this._bumpSuperimpose) {
                    defines.BUMPSUPERIMPOSE = true;
                }
                if (this._bumpAffectsReflection) {
                    defines.BUMPAFFECTSREFLECTION = true;
                }
            }
            // Lights
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, true, this._maxSimultaneousLights, this._disableLighting);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
            // Configure this
            this._mesh = mesh;
            if (this._waitingRenderList) {
                for (var i = 0; i < this._waitingRenderList.length; i++) {
                    this.addToRenderList(scene.getNodeByID(this._waitingRenderList[i]));
                }
                this._waitingRenderList = null;
            }
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                if (defines.LOGARITHMICDEPTH) {
                    fallbacks.addFallback(0, "LOGARITHMICDEPTH");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.UV2) {
                    attribs.push(BABYLON.VertexBuffer.UV2Kind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                // Legacy browser patch
                var shaderName = "water";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor", "vSpecularColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vNormalInfos",
                    "mBones",
                    "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4", "normalMatrix",
                    "logarithmicDepthConstant",
                    // Water
                    "worldReflectionViewProjection", "windDirection", "waveLength", "time", "windForce",
                    "cameraPosition", "bumpHeight", "waveHeight", "waterColor", "waterColor2", "colorBlendFactor", "colorBlendFactor2", "waveSpeed"
                ];
                var samplers = ["normalSampler",
                    // Water
                    "refractionSampler", "reflectionSampler"
                ];
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: this.maxSimultaneousLights
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this._maxSimultaneousLights }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        WaterMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect || !this._mesh) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            if (this._mustRebind(scene, effect)) {
                // Textures
                if (this.bumpTexture && BABYLON.StandardMaterial.BumpTextureEnabled) {
                    this._activeEffect.setTexture("normalSampler", this.bumpTexture);
                    this._activeEffect.setFloat2("vNormalInfos", this.bumpTexture.coordinatesIndex, this.bumpTexture.level);
                    this._activeEffect.setMatrix("normalMatrix", this.bumpTexture.getTextureMatrix());
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
            if (defines.SPECULARTERM) {
                this._activeEffect.setColor4("vSpecularColor", this.specularColor, this.specularPower);
            }
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            // Log. depth
            BABYLON.MaterialHelper.BindLogDepth(defines, this._activeEffect, scene);
            // Water
            if (BABYLON.StandardMaterial.ReflectionTextureEnabled) {
                this._activeEffect.setTexture("refractionSampler", this._refractionRTT);
                this._activeEffect.setTexture("reflectionSampler", this._reflectionRTT);
            }
            var wrvp = this._mesh.getWorldMatrix().multiply(this._reflectionTransform).multiply(scene.getProjectionMatrix());
            // Add delta time. Prevent adding delta time if it hasn't changed.
            var deltaTime = scene.getEngine().getDeltaTime();
            if (deltaTime !== this._lastDeltaTime) {
                this._lastDeltaTime = deltaTime;
                this._lastTime += this._lastDeltaTime;
            }
            this._activeEffect.setMatrix("worldReflectionViewProjection", wrvp);
            this._activeEffect.setVector2("windDirection", this.windDirection);
            this._activeEffect.setFloat("waveLength", this.waveLength);
            this._activeEffect.setFloat("time", this._lastTime / 100000);
            this._activeEffect.setFloat("windForce", this.windForce);
            this._activeEffect.setFloat("waveHeight", this.waveHeight);
            this._activeEffect.setFloat("bumpHeight", this.bumpHeight);
            this._activeEffect.setColor4("waterColor", this.waterColor, 1.0);
            this._activeEffect.setFloat("colorBlendFactor", this.colorBlendFactor);
            this._activeEffect.setColor4("waterColor2", this.waterColor2, 1.0);
            this._activeEffect.setFloat("colorBlendFactor2", this.colorBlendFactor2);
            this._activeEffect.setFloat("waveSpeed", this.waveSpeed);
            this._afterBind(mesh, this._activeEffect);
        };
        WaterMaterial.prototype._createRenderTargets = function (scene, renderTargetSize) {
            var _this = this;
            // Render targets
            this._refractionRTT = new BABYLON.RenderTargetTexture(name + "_refraction", { width: renderTargetSize.x, height: renderTargetSize.y }, scene, false, true);
            this._refractionRTT.wrapU = BABYLON.Texture.MIRROR_ADDRESSMODE;
            this._refractionRTT.wrapV = BABYLON.Texture.MIRROR_ADDRESSMODE;
            this._refractionRTT.ignoreCameraViewport = true;
            this._reflectionRTT = new BABYLON.RenderTargetTexture(name + "_reflection", { width: renderTargetSize.x, height: renderTargetSize.y }, scene, false, true);
            this._reflectionRTT.wrapU = BABYLON.Texture.MIRROR_ADDRESSMODE;
            this._reflectionRTT.wrapV = BABYLON.Texture.MIRROR_ADDRESSMODE;
            this._reflectionRTT.ignoreCameraViewport = true;
            var isVisible;
            var clipPlane = null;
            var savedViewMatrix;
            var mirrorMatrix = BABYLON.Matrix.Zero();
            this._refractionRTT.onBeforeRender = function () {
                if (_this._mesh) {
                    isVisible = _this._mesh.isVisible;
                    _this._mesh.isVisible = false;
                }
            };
            this._refractionRTT.onAfterRender = function () {
                if (_this._mesh) {
                    _this._mesh.isVisible = isVisible;
                }
            };
            this._reflectionRTT.onBeforeRender = function () {
                if (_this._mesh) {
                    isVisible = _this._mesh.isVisible;
                    _this._mesh.isVisible = false;
                }
                // Clip plane
                clipPlane = scene.clipPlane;
                var positiony = _this._mesh ? _this._mesh.position.y : 0.0;
                scene.clipPlane = BABYLON.Plane.FromPositionAndNormal(new BABYLON.Vector3(0, positiony - 0.05, 0), new BABYLON.Vector3(0, -1, 0));
                // Transform
                BABYLON.Matrix.ReflectionToRef(scene.clipPlane, mirrorMatrix);
                savedViewMatrix = scene.getViewMatrix();
                mirrorMatrix.multiplyToRef(savedViewMatrix, _this._reflectionTransform);
                scene.setTransformMatrix(_this._reflectionTransform, scene.getProjectionMatrix());
                scene.getEngine().cullBackFaces = false;
                scene._mirroredCameraPosition = BABYLON.Vector3.TransformCoordinates(scene.activeCamera.position, mirrorMatrix);
            };
            this._reflectionRTT.onAfterRender = function () {
                if (_this._mesh) {
                    _this._mesh.isVisible = isVisible;
                }
                // Clip plane
                scene.clipPlane = clipPlane;
                // Transform
                scene.setTransformMatrix(savedViewMatrix, scene.getProjectionMatrix());
                scene.getEngine().cullBackFaces = true;
                scene._mirroredCameraPosition = null;
            };
        };
        WaterMaterial.prototype.getAnimatables = function () {
            var results = [];
            if (this.bumpTexture && this.bumpTexture.animations && this.bumpTexture.animations.length > 0) {
                results.push(this.bumpTexture);
            }
            if (this._reflectionRTT && this._reflectionRTT.animations && this._reflectionRTT.animations.length > 0) {
                results.push(this._reflectionRTT);
            }
            if (this._refractionRTT && this._refractionRTT.animations && this._refractionRTT.animations.length > 0) {
                results.push(this._refractionRTT);
            }
            return results;
        };
        WaterMaterial.prototype.getActiveTextures = function () {
            var activeTextures = _super.prototype.getActiveTextures.call(this);
            if (this._bumpTexture) {
                activeTextures.push(this._bumpTexture);
            }
            return activeTextures;
        };
        WaterMaterial.prototype.hasTexture = function (texture) {
            if (_super.prototype.hasTexture.call(this, texture)) {
                return true;
            }
            if (this._bumpTexture === texture) {
                return true;
            }
            return false;
        };
        WaterMaterial.prototype.dispose = function (forceDisposeEffect) {
            if (this.bumpTexture) {
                this.bumpTexture.dispose();
            }
            var index = this.getScene().customRenderTargets.indexOf(this._refractionRTT);
            if (index != -1) {
                this.getScene().customRenderTargets.splice(index, 1);
            }
            index = -1;
            index = this.getScene().customRenderTargets.indexOf(this._reflectionRTT);
            if (index != -1) {
                this.getScene().customRenderTargets.splice(index, 1);
            }
            if (this._reflectionRTT) {
                this._reflectionRTT.dispose();
            }
            if (this._refractionRTT) {
                this._refractionRTT.dispose();
            }
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        WaterMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new WaterMaterial(name, _this.getScene()); }, this);
        };
        WaterMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.WaterMaterial";
            serializationObject.renderList = [];
            if (this._refractionRTT && this._refractionRTT.renderList) {
                for (var i = 0; i < this._refractionRTT.renderList.length; i++) {
                    serializationObject.renderList.push(this._refractionRTT.renderList[i].id);
                }
            }
            return serializationObject;
        };
        WaterMaterial.prototype.getClassName = function () {
            return "WaterMaterial";
        };
        // Statics
        WaterMaterial.Parse = function (source, scene, rootUrl) {
            var mat = BABYLON.SerializationHelper.Parse(function () { return new WaterMaterial(source.name, scene); }, source, scene, rootUrl);
            mat._waitingRenderList = source.renderList;
            return mat;
        };
        WaterMaterial.CreateDefaultMesh = function (name, scene) {
            var mesh = BABYLON.Mesh.CreateGround(name, 512, 512, 32, scene, false);
            return mesh;
        };
        __decorate([
            BABYLON.serializeAsTexture("bumpTexture")
        ], WaterMaterial.prototype, "_bumpTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], WaterMaterial.prototype, "bumpTexture", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], WaterMaterial.prototype, "diffuseColor", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], WaterMaterial.prototype, "specularColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "specularPower", void 0);
        __decorate([
            BABYLON.serialize("disableLighting")
        ], WaterMaterial.prototype, "_disableLighting", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], WaterMaterial.prototype, "disableLighting", void 0);
        __decorate([
            BABYLON.serialize("maxSimultaneousLights")
        ], WaterMaterial.prototype, "_maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], WaterMaterial.prototype, "maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "windForce", void 0);
        __decorate([
            BABYLON.serializeAsVector2()
        ], WaterMaterial.prototype, "windDirection", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "waveHeight", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "bumpHeight", void 0);
        __decorate([
            BABYLON.serialize("bumpSuperimpose")
        ], WaterMaterial.prototype, "_bumpSuperimpose", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsMiscDirty")
        ], WaterMaterial.prototype, "bumpSuperimpose", void 0);
        __decorate([
            BABYLON.serialize("fresnelSeparate")
        ], WaterMaterial.prototype, "_fresnelSeparate", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsMiscDirty")
        ], WaterMaterial.prototype, "fresnelSeparate", void 0);
        __decorate([
            BABYLON.serialize("bumpAffectsReflection")
        ], WaterMaterial.prototype, "_bumpAffectsReflection", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsMiscDirty")
        ], WaterMaterial.prototype, "bumpAffectsReflection", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], WaterMaterial.prototype, "waterColor", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "colorBlendFactor", void 0);
        __decorate([
            BABYLON.serializeAsColor3()
        ], WaterMaterial.prototype, "waterColor2", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "colorBlendFactor2", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "waveLength", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "waveSpeed", void 0);
        __decorate([
            BABYLON.serialize()
        ], WaterMaterial.prototype, "useLogarithmicDepth", null);
        return WaterMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.WaterMaterial = WaterMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.waterMaterial.js.map

BABYLON.Effect.ShadersStore['waterVertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef BUMP\nvarying vec2 vNormalUV;\n#ifdef BUMPSUPERIMPOSE\nvarying vec2 vNormalUV2;\n#endif\nuniform mat4 normalMatrix;\nuniform vec2 vNormalInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n#include<logDepthDeclaration>\n\nuniform mat4 worldReflectionViewProjection;\nuniform vec2 windDirection;\nuniform float waveLength;\nuniform float time;\nuniform float windForce;\nuniform float waveHeight;\nuniform float waveSpeed;\n\nvarying vec3 vPosition;\nvarying vec3 vRefractionMapTexCoord;\nvarying vec3 vReflectionMapTexCoord;\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef BUMP\nif (vNormalInfos.x == 0.)\n{\nvNormalUV=vec2(normalMatrix*vec4((uv*1.0)/waveLength+time*windForce*windDirection,1.0,0.0));\n#ifdef BUMPSUPERIMPOSE\nvNormalUV2=vec2(normalMatrix*vec4((uv*0.721)/waveLength+time*1.2*windForce*windDirection,1.0,0.0));\n#endif\n}\nelse\n{\nvNormalUV=vec2(normalMatrix*vec4((uv2*1.0)/waveLength+time*windForce*windDirection ,1.0,0.0));\n#ifdef BUMPSUPERIMPOSE\nvNormalUV2=vec2(normalMatrix*vec4((uv2*0.721)/waveLength+time*1.2*windForce*windDirection ,1.0,0.0));\n#endif\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\nvec3 p=position;\nfloat newY=(sin(((p.x/0.05)+time*waveSpeed))*waveHeight*windDirection.x*5.0)\n+(cos(((p.z/0.05)+time*waveSpeed))*waveHeight*windDirection.y*5.0);\np.y+=abs(newY);\ngl_Position=viewProjection*finalWorld*vec4(p,1.0);\n#ifdef REFLECTION\nworldPos=viewProjection*finalWorld*vec4(p,1.0);\n\nvPosition=position;\nvRefractionMapTexCoord.x=0.5*(worldPos.w+worldPos.x);\nvRefractionMapTexCoord.y=0.5*(worldPos.w+worldPos.y);\nvRefractionMapTexCoord.z=worldPos.w;\nworldPos=worldReflectionViewProjection*vec4(position,1.0);\nvReflectionMapTexCoord.x=0.5*(worldPos.w+worldPos.x);\nvReflectionMapTexCoord.y=0.5*(worldPos.w+worldPos.y);\nvReflectionMapTexCoord.z=worldPos.w;\n#endif\n#include<logDepthVertex>\n}\n";
BABYLON.Effect.ShadersStore['waterPixelShader'] = "#ifdef LOGARITHMICDEPTH\n#extension GL_EXT_frag_depth : enable\n#endif\nprecision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n#ifdef SPECULARTERM\nuniform vec4 vSpecularColor;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef BUMP\nvarying vec2 vNormalUV;\nvarying vec2 vNormalUV2;\nuniform sampler2D normalSampler;\nuniform vec2 vNormalInfos;\n#endif\nuniform sampler2D refractionSampler;\nuniform sampler2D reflectionSampler;\n\nconst float LOG2=1.442695;\nuniform vec3 cameraPosition;\nuniform vec4 waterColor;\nuniform float colorBlendFactor;\nuniform vec4 waterColor2;\nuniform float colorBlendFactor2;\nuniform float bumpHeight;\nuniform float time;\n\nvarying vec3 vRefractionMapTexCoord;\nvarying vec3 vReflectionMapTexCoord;\nvarying vec3 vPosition;\n#include<clipPlaneFragmentDeclaration>\n#include<logDepthDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef BUMP\n#ifdef BUMPSUPERIMPOSE\nbaseColor=0.6*texture2D(normalSampler,vNormalUV)+0.4*texture2D(normalSampler,vec2(vNormalUV2.x,vNormalUV2.y));\n#else\nbaseColor=texture2D(normalSampler,vNormalUV);\n#endif\nvec3 bumpColor=baseColor.rgb;\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\nbaseColor.rgb*=vNormalInfos.y;\n#else\nvec3 bumpColor=vec3(1.0);\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec2 perturbation=bumpHeight*(baseColor.rg-0.5);\n#ifdef BUMPAFFECTSREFLECTION\nvec3 normalW=normalize(vNormalW+vec3(perturbation.x*8.0,0.0,perturbation.y*8.0));\nif (normalW.y<0.0) {\nnormalW.y=-normalW.y;\n}\n#else\nvec3 normalW=normalize(vNormalW);\n#endif\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\nvec2 perturbation=bumpHeight*(vec2(1.0,1.0)-0.5);\n#endif\n#ifdef FRESNELSEPARATE\n#ifdef REFLECTION\n\nvec3 eyeVector=normalize(vEyePosition-vPosition);\nvec2 projectedRefractionTexCoords=clamp(vRefractionMapTexCoord.xy/vRefractionMapTexCoord.z+perturbation*0.5,0.0,1.0);\nvec4 refractiveColor=texture2D(refractionSampler,projectedRefractionTexCoords);\nvec2 projectedReflectionTexCoords=clamp(vec2(\nvReflectionMapTexCoord.x/vReflectionMapTexCoord.z+perturbation.x*0.3,\nvReflectionMapTexCoord.y/vReflectionMapTexCoord.z+perturbation.y\n),0.0,1.0);\nvec4 reflectiveColor=texture2D(reflectionSampler,projectedReflectionTexCoords);\nvec3 upVector=vec3(0.0,1.0,0.0);\nfloat fresnelTerm=clamp(abs(pow(dot(eyeVector,upVector),3.0)),0.05,0.65);\nfloat IfresnelTerm=1.0-fresnelTerm;\nrefractiveColor=colorBlendFactor*waterColor+(1.0-colorBlendFactor)*refractiveColor;\nreflectiveColor=IfresnelTerm*colorBlendFactor2*waterColor+(1.0-colorBlendFactor2*IfresnelTerm)*reflectiveColor;\nvec4 combinedColor=refractiveColor*fresnelTerm+reflectiveColor*IfresnelTerm;\nbaseColor=combinedColor;\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\n#ifdef SPECULARTERM\nfloat glossiness=vSpecularColor.a;\nvec3 specularBase=vec3(0.,0.,0.);\nvec3 specularColor=vSpecularColor.rgb;\n#else\nfloat glossiness=0.;\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\nvec3 finalDiffuse=clamp(baseColor.rgb,0.0,1.0);\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n#ifdef SPECULARTERM\nvec3 finalSpecular=specularBase*specularColor;\n#else\nvec3 finalSpecular=vec3(0.0);\n#endif\n#else \n#ifdef REFLECTION\n\nvec3 eyeVector=normalize(vEyePosition-vPosition);\nvec2 projectedRefractionTexCoords=clamp(vRefractionMapTexCoord.xy/vRefractionMapTexCoord.z+perturbation,0.0,1.0);\nvec4 refractiveColor=texture2D(refractionSampler,projectedRefractionTexCoords);\nvec2 projectedReflectionTexCoords=clamp(vReflectionMapTexCoord.xy/vReflectionMapTexCoord.z+perturbation,0.0,1.0);\nvec4 reflectiveColor=texture2D(reflectionSampler,projectedReflectionTexCoords);\nvec3 upVector=vec3(0.0,1.0,0.0);\nfloat fresnelTerm=max(dot(eyeVector,upVector),0.0);\nvec4 combinedColor=refractiveColor*fresnelTerm+reflectiveColor*(1.0-fresnelTerm);\nbaseColor=colorBlendFactor*waterColor+(1.0-colorBlendFactor)*combinedColor;\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\n#ifdef SPECULARTERM\nfloat glossiness=vSpecularColor.a;\nvec3 specularBase=vec3(0.,0.,0.);\nvec3 specularColor=vSpecularColor.rgb;\n#else\nfloat glossiness=0.;\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\nvec3 finalDiffuse=clamp(baseColor.rgb,0.0,1.0);\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n#ifdef SPECULARTERM\nvec3 finalSpecular=specularBase*specularColor;\n#else\nvec3 finalSpecular=vec3(0.0);\n#endif\n#endif\n\nvec4 color=vec4(finalDiffuse+finalSpecular,alpha);\n#include<logDepthFragment>\n#include<fogFragment>\ngl_FragColor=color;\n}\n";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var BABYLON;
(function (BABYLON) {
    var ShadowOnlyMaterialDefines = /** @class */ (function (_super) {
        __extends(ShadowOnlyMaterialDefines, _super);
        function ShadowOnlyMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.CLIPPLANE = false;
            _this.CLIPPLANE2 = false;
            _this.CLIPPLANE3 = false;
            _this.CLIPPLANE4 = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.NORMAL = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.rebuild();
            return _this;
        }
        return ShadowOnlyMaterialDefines;
    }(BABYLON.MaterialDefines));
    var ShadowOnlyMaterial = /** @class */ (function (_super) {
        __extends(ShadowOnlyMaterial, _super);
        function ShadowOnlyMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this.shadowColor = BABYLON.Color3.Black();
            return _this;
        }
        ShadowOnlyMaterial.prototype.needAlphaBlending = function () {
            return true;
        };
        ShadowOnlyMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        ShadowOnlyMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        Object.defineProperty(ShadowOnlyMaterial.prototype, "activeLight", {
            get: function () {
                return this._activeLight;
            },
            set: function (light) {
                this._activeLight = light;
            },
            enumerable: true,
            configurable: true
        });
        // Methods
        ShadowOnlyMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new ShadowOnlyMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            // Ensure that active light is the first shadow light
            if (this._activeLight) {
                for (var _i = 0, _a = mesh._lightSources; _i < _a.length; _i++) {
                    var light = _a[_i];
                    if (light.shadowEnabled) {
                        if (this._activeLight === light) {
                            break; // We are good
                        }
                        var lightPosition = mesh._lightSources.indexOf(this._activeLight);
                        if (lightPosition !== -1) {
                            mesh._lightSources.splice(lightPosition, 1);
                            mesh._lightSources.splice(0, 0, this._activeLight);
                        }
                        break;
                    }
                }
            }
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, 1);
            // Attribs
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, false, true);
            // Get correct effect
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, 1);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                var shaderName = "shadowOnly";
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType",
                    "vFogInfos", "vFogColor", "pointSize", "alpha", "shadowColor",
                    "mBones",
                    "vClipPlane", "vClipPlane2", "vClipPlane3", "vClipPlane4"
                ];
                var samplers = new Array();
                var uniformBuffers = new Array();
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: 1
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: 1 }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        ShadowOnlyMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            BABYLON.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
            if (this._mustRebind(scene, effect)) {
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                this._activeEffect.setFloat("alpha", this.alpha);
                this._activeEffect.setColor3("shadowColor", this.shadowColor);
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            // Lights
            if (scene.lightsEnabled) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, 1);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._afterBind(mesh, this._activeEffect);
        };
        ShadowOnlyMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new ShadowOnlyMaterial(name, _this.getScene()); }, this);
        };
        ShadowOnlyMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.ShadowOnlyMaterial";
            return serializationObject;
        };
        ShadowOnlyMaterial.prototype.getClassName = function () {
            return "ShadowOnlyMaterial";
        };
        // Statics
        ShadowOnlyMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new ShadowOnlyMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        return ShadowOnlyMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.ShadowOnlyMaterial = ShadowOnlyMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.shadowOnlyMaterial.js.map

BABYLON.Effect.ShadersStore['shadowOnlyVertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#include<bonesDeclaration>\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#include<bonesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['shadowOnlyPixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform float alpha;\nuniform vec3 shadowColor;\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#include<lightFragment>[0..1]\n\nvec4 color=vec4(shadowColor,(1.0-clamp(shadow,0.,1.))*alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    /**
     * AsciiArtFontTexture is the helper class used to easily create your ascii art font texture.
     *
     * It basically takes care rendering the font front the given font size to a texture.
     * This is used later on in the postprocess.
     */
    var AsciiArtFontTexture = /** @class */ (function (_super) {
        __extends(AsciiArtFontTexture, _super);
        /**
         * Create a new instance of the Ascii Art FontTexture class
         * @param name the name of the texture
         * @param font the font to use, use the W3C CSS notation
         * @param text the caracter set to use in the rendering.
         * @param scene the scene that owns the texture
         */
        function AsciiArtFontTexture(name, font, text, scene) {
            if (scene === void 0) { scene = null; }
            var _this = _super.call(this, scene) || this;
            scene = _this.getScene();
            if (!scene) {
                return _this;
            }
            _this.name = name;
            _this._text == text;
            _this._font == font;
            _this.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
            _this.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            //this.anisotropicFilteringLevel = 1;
            // Get the font specific info.
            var maxCharHeight = _this.getFontHeight(font);
            var maxCharWidth = _this.getFontWidth(font);
            _this._charSize = Math.max(maxCharHeight.height, maxCharWidth);
            // This is an approximate size, but should always be able to fit at least the maxCharCount.
            var textureWidth = Math.ceil(_this._charSize * text.length);
            var textureHeight = _this._charSize;
            // Create the texture that will store the font characters.
            _this._texture = scene.getEngine().createDynamicTexture(textureWidth, textureHeight, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
            //scene.getEngine().setclamp
            var textureSize = _this.getSize();
            // Create a canvas with the final size: the one matching the texture.
            var canvas = document.createElement("canvas");
            canvas.width = textureSize.width;
            canvas.height = textureSize.height;
            var context = canvas.getContext("2d");
            context.textBaseline = "top";
            context.font = font;
            context.fillStyle = "white";
            context.imageSmoothingEnabled = false;
            // Sets the text in the texture.
            for (var i = 0; i < text.length; i++) {
                context.fillText(text[i], i * _this._charSize, -maxCharHeight.offset);
            }
            // Flush the text in the dynamic texture.
            scene.getEngine().updateDynamicTexture(_this._texture, canvas, false, true);
            return _this;
        }
        Object.defineProperty(AsciiArtFontTexture.prototype, "charSize", {
            /**
             * Gets the size of one char in the texture (each char fits in size * size space in the texture).
             */
            get: function () {
                return this._charSize;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets the max char width of a font.
         * @param font the font to use, use the W3C CSS notation
         * @return the max char width
         */
        AsciiArtFontTexture.prototype.getFontWidth = function (font) {
            var fontDraw = document.createElement("canvas");
            var ctx = fontDraw.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.font = font;
            return ctx.measureText("W").width;
        };
        // More info here: https://videlais.com/2014/03/16/the-many-and-varied-problems-with-measuring-font-height-for-html5-canvas/
        /**
         * Gets the max char height of a font.
         * @param font the font to use, use the W3C CSS notation
         * @return the max char height
         */
        AsciiArtFontTexture.prototype.getFontHeight = function (font) {
            var fontDraw = document.createElement("canvas");
            var ctx = fontDraw.getContext('2d');
            ctx.fillRect(0, 0, fontDraw.width, fontDraw.height);
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.font = font;
            ctx.fillText('jH|', 0, 0);
            var pixels = ctx.getImageData(0, 0, fontDraw.width, fontDraw.height).data;
            var start = -1;
            var end = -1;
            for (var row = 0; row < fontDraw.height; row++) {
                for (var column = 0; column < fontDraw.width; column++) {
                    var index = (row * fontDraw.width + column) * 4;
                    if (pixels[index] === 0) {
                        if (column === fontDraw.width - 1 && start !== -1) {
                            end = row;
                            row = fontDraw.height;
                            break;
                        }
                        continue;
                    }
                    else {
                        if (start === -1) {
                            start = row;
                        }
                        break;
                    }
                }
            }
            return { height: (end - start) + 1, offset: start - 1 };
        };
        /**
         * Clones the current AsciiArtTexture.
         * @return the clone of the texture.
         */
        AsciiArtFontTexture.prototype.clone = function () {
            return new AsciiArtFontTexture(this.name, this._font, this._text, this.getScene());
        };
        /**
         * Parses a json object representing the texture and returns an instance of it.
         * @param source the source JSON representation
         * @param scene the scene to create the texture for
         * @return the parsed texture
         */
        AsciiArtFontTexture.Parse = function (source, scene) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new AsciiArtFontTexture(source.name, source.font, source.text, scene); }, source, scene, null);
            return texture;
        };
        __decorate([
            BABYLON.serialize("font")
        ], AsciiArtFontTexture.prototype, "_font", void 0);
        __decorate([
            BABYLON.serialize("text")
        ], AsciiArtFontTexture.prototype, "_text", void 0);
        return AsciiArtFontTexture;
    }(BABYLON.BaseTexture));
    BABYLON.AsciiArtFontTexture = AsciiArtFontTexture;
    /**
     * AsciiArtPostProcess helps rendering everithing in Ascii Art.
     *
     * Simmply add it to your scene and let the nerd that lives in you have fun.
     * Example usage: var pp = new AsciiArtPostProcess("myAscii", "20px Monospace", camera);
     */
    var AsciiArtPostProcess = /** @class */ (function (_super) {
        __extends(AsciiArtPostProcess, _super);
        /**
         * Instantiates a new Ascii Art Post Process.
         * @param name the name to give to the postprocess
         * @camera the camera to apply the post process to.
         * @param options can either be the font name or an option object following the IAsciiArtPostProcessOptions format
         */
        function AsciiArtPostProcess(name, camera, options) {
            var _this = _super.call(this, name, 'asciiart', ['asciiArtFontInfos', 'asciiArtOptions'], ['asciiArtFont'], {
                width: camera.getEngine().getRenderWidth(),
                height: camera.getEngine().getRenderHeight()
            }, camera, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, camera.getEngine(), true) || this;
            /**
             * This defines the amount you want to mix the "tile" or caracter space colored in the ascii art.
             * This number is defined between 0 and 1;
             */
            _this.mixToTile = 0;
            /**
             * This defines the amount you want to mix the normal rendering pass in the ascii art.
             * This number is defined between 0 and 1;
             */
            _this.mixToNormal = 0;
            // Default values.
            var font = "40px Monospace";
            var characterSet = " `-.'_:,\"=^;<+!*?/cL\\zrs7TivJtC{3F)Il(xZfY5S2eajo14[nuyE]P6V9kXpKwGhqAUbOd8#HRDB0$mgMW&Q%N@";
            // Use options.
            if (options) {
                if (typeof (options) === "string") {
                    font = options;
                }
                else {
                    font = options.font || font;
                    characterSet = options.characterSet || characterSet;
                    _this.mixToTile = options.mixToTile || _this.mixToTile;
                    _this.mixToNormal = options.mixToNormal || _this.mixToNormal;
                }
            }
            _this._asciiArtFontTexture = new AsciiArtFontTexture(name, font, characterSet, camera.getScene());
            var textureSize = _this._asciiArtFontTexture.getSize();
            _this.onApply = function (effect) {
                effect.setTexture("asciiArtFont", _this._asciiArtFontTexture);
                effect.setFloat4("asciiArtFontInfos", _this._asciiArtFontTexture.charSize, characterSet.length, textureSize.width, textureSize.height);
                effect.setFloat4("asciiArtOptions", _this.width, _this.height, _this.mixToNormal, _this.mixToTile);
            };
            return _this;
        }
        return AsciiArtPostProcess;
    }(BABYLON.PostProcess));
    BABYLON.AsciiArtPostProcess = AsciiArtPostProcess;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.asciiArtPostProcess.js.map

BABYLON.Effect.ShadersStore['asciiartPixelShader'] = "\nvarying vec2 vUV;\nuniform sampler2D textureSampler;\nuniform sampler2D asciiArtFont;\n\nuniform vec4 asciiArtFontInfos;\nuniform vec4 asciiArtOptions;\n\nfloat getLuminance(vec3 color)\n{\nreturn clamp(dot(color,vec3(0.2126,0.7152,0.0722)),0.,1.);\n}\n\nvoid main(void) \n{\nfloat caracterSize=asciiArtFontInfos.x;\nfloat numChar=asciiArtFontInfos.y-1.0;\nfloat fontx=asciiArtFontInfos.z;\nfloat fonty=asciiArtFontInfos.w;\nfloat screenx=asciiArtOptions.x;\nfloat screeny=asciiArtOptions.y;\nfloat tileX=float(floor((gl_FragCoord.x)/caracterSize))*caracterSize/screenx;\nfloat tileY=float(floor((gl_FragCoord.y)/caracterSize))*caracterSize/screeny;\nvec2 tileUV=vec2(tileX,tileY);\nvec4 tileColor=texture2D(textureSampler,tileUV);\nvec4 baseColor=texture2D(textureSampler,vUV);\nfloat tileLuminance=getLuminance(tileColor.rgb);\nfloat offsetx=(float(floor(tileLuminance*numChar)))*caracterSize/fontx;\nfloat offsety=0.0;\nfloat x=float(mod(gl_FragCoord.x,caracterSize))/fontx;\nfloat y=float(mod(gl_FragCoord.y,caracterSize))/fonty;\nvec4 finalColor=texture2D(asciiArtFont,vec2(offsetx+x,offsety+(caracterSize/fonty-y)));\nfinalColor.rgb*=tileColor.rgb;\nfinalColor.a=1.0;\nfinalColor=mix(finalColor,tileColor,asciiArtOptions.w);\nfinalColor=mix(finalColor,baseColor,asciiArtOptions.z);\ngl_FragColor=finalColor;\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    /**
     * DigitalRainFontTexture is the helper class used to easily create your digital rain font texture.
     *
     * It basically takes care rendering the font front the given font size to a texture.
     * This is used later on in the postprocess.
     */
    var DigitalRainFontTexture = /** @class */ (function (_super) {
        __extends(DigitalRainFontTexture, _super);
        /**
         * Create a new instance of the Digital Rain FontTexture class
         * @param name the name of the texture
         * @param font the font to use, use the W3C CSS notation
         * @param text the caracter set to use in the rendering.
         * @param scene the scene that owns the texture
         */
        function DigitalRainFontTexture(name, font, text, scene) {
            if (scene === void 0) { scene = null; }
            var _this = _super.call(this, scene) || this;
            scene = _this.getScene();
            if (!scene) {
                return _this;
            }
            _this.name = name;
            _this._text == text;
            _this._font == font;
            _this.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
            _this.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            //this.anisotropicFilteringLevel = 1;
            // Get the font specific info.
            var maxCharHeight = _this.getFontHeight(font);
            var maxCharWidth = _this.getFontWidth(font);
            _this._charSize = Math.max(maxCharHeight.height, maxCharWidth);
            // This is an approximate size, but should always be able to fit at least the maxCharCount.
            var textureWidth = _this._charSize;
            var textureHeight = Math.ceil(_this._charSize * text.length);
            // Create the texture that will store the font characters.
            _this._texture = scene.getEngine().createDynamicTexture(textureWidth, textureHeight, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
            //scene.getEngine().setclamp
            var textureSize = _this.getSize();
            // Create a canvas with the final size: the one matching the texture.
            var canvas = document.createElement("canvas");
            canvas.width = textureSize.width;
            canvas.height = textureSize.height;
            var context = canvas.getContext("2d");
            context.textBaseline = "top";
            context.font = font;
            context.fillStyle = "white";
            context.imageSmoothingEnabled = false;
            // Sets the text in the texture.
            for (var i = 0; i < text.length; i++) {
                context.fillText(text[i], 0, i * _this._charSize - maxCharHeight.offset);
            }
            // Flush the text in the dynamic texture.
            scene.getEngine().updateDynamicTexture(_this._texture, canvas, false, true);
            return _this;
        }
        Object.defineProperty(DigitalRainFontTexture.prototype, "charSize", {
            /**
             * Gets the size of one char in the texture (each char fits in size * size space in the texture).
             */
            get: function () {
                return this._charSize;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Gets the max char width of a font.
         * @param font the font to use, use the W3C CSS notation
         * @return the max char width
         */
        DigitalRainFontTexture.prototype.getFontWidth = function (font) {
            var fontDraw = document.createElement("canvas");
            var ctx = fontDraw.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.font = font;
            return ctx.measureText("W").width;
        };
        // More info here: https://videlais.com/2014/03/16/the-many-and-varied-problems-with-measuring-font-height-for-html5-canvas/
        /**
         * Gets the max char height of a font.
         * @param font the font to use, use the W3C CSS notation
         * @return the max char height
         */
        DigitalRainFontTexture.prototype.getFontHeight = function (font) {
            var fontDraw = document.createElement("canvas");
            var ctx = fontDraw.getContext('2d');
            ctx.fillRect(0, 0, fontDraw.width, fontDraw.height);
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.font = font;
            ctx.fillText('jH|', 0, 0);
            var pixels = ctx.getImageData(0, 0, fontDraw.width, fontDraw.height).data;
            var start = -1;
            var end = -1;
            for (var row = 0; row < fontDraw.height; row++) {
                for (var column = 0; column < fontDraw.width; column++) {
                    var index = (row * fontDraw.width + column) * 4;
                    if (pixels[index] === 0) {
                        if (column === fontDraw.width - 1 && start !== -1) {
                            end = row;
                            row = fontDraw.height;
                            break;
                        }
                        continue;
                    }
                    else {
                        if (start === -1) {
                            start = row;
                        }
                        break;
                    }
                }
            }
            return { height: (end - start) + 1, offset: start - 1 };
        };
        /**
         * Clones the current DigitalRainFontTexture.
         * @return the clone of the texture.
         */
        DigitalRainFontTexture.prototype.clone = function () {
            return new DigitalRainFontTexture(this.name, this._font, this._text, this.getScene());
        };
        /**
         * Parses a json object representing the texture and returns an instance of it.
         * @param source the source JSON representation
         * @param scene the scene to create the texture for
         * @return the parsed texture
         */
        DigitalRainFontTexture.Parse = function (source, scene) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new DigitalRainFontTexture(source.name, source.font, source.text, scene); }, source, scene, null);
            return texture;
        };
        __decorate([
            BABYLON.serialize("font")
        ], DigitalRainFontTexture.prototype, "_font", void 0);
        __decorate([
            BABYLON.serialize("text")
        ], DigitalRainFontTexture.prototype, "_text", void 0);
        return DigitalRainFontTexture;
    }(BABYLON.BaseTexture));
    BABYLON.DigitalRainFontTexture = DigitalRainFontTexture;
    /**
     * DigitalRainPostProcess helps rendering everithing in digital rain.
     *
     * Simmply add it to your scene and let the nerd that lives in you have fun.
     * Example usage: var pp = new DigitalRainPostProcess("digitalRain", "20px Monospace", camera);
     */
    var DigitalRainPostProcess = /** @class */ (function (_super) {
        __extends(DigitalRainPostProcess, _super);
        /**
         * Instantiates a new Digital Rain Post Process.
         * @param name the name to give to the postprocess
         * @camera the camera to apply the post process to.
         * @param options can either be the font name or an option object following the IDigitalRainPostProcessOptions format
         */
        function DigitalRainPostProcess(name, camera, options) {
            var _this = _super.call(this, name, 'digitalrain', ['digitalRainFontInfos', 'digitalRainOptions', 'cosTimeZeroOne', 'matrixSpeed'], ['digitalRainFont'], {
                width: camera.getEngine().getRenderWidth(),
                height: camera.getEngine().getRenderHeight()
            }, camera, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, camera.getEngine(), true) || this;
            /**
             * This defines the amount you want to mix the "tile" or caracter space colored in the digital rain.
             * This number is defined between 0 and 1;
             */
            _this.mixToTile = 0;
            /**
             * This defines the amount you want to mix the normal rendering pass in the digital rain.
             * This number is defined between 0 and 1;
             */
            _this.mixToNormal = 0;
            // Default values.
            var font = "15px Monospace";
            var characterSet = "古池や蛙飛び込む水の音ふるいけやかわずとびこむみずのおと初しぐれ猿も小蓑をほしげ也はつしぐれさるもこみのをほしげなり江戸の雨何石呑んだ時鳥えどのあめなんごくのんだほととぎす";
            // Use options.
            if (options) {
                if (typeof (options) === "string") {
                    font = options;
                }
                else {
                    font = options.font || font;
                    _this.mixToTile = options.mixToTile || _this.mixToTile;
                    _this.mixToNormal = options.mixToNormal || _this.mixToNormal;
                }
            }
            _this._digitalRainFontTexture = new DigitalRainFontTexture(name, font, characterSet, camera.getScene());
            var textureSize = _this._digitalRainFontTexture.getSize();
            var alpha = 0.0;
            var cosTimeZeroOne = 0.0;
            var matrix = new BABYLON.Matrix();
            for (var i = 0; i < 16; i++) {
                matrix.m[i] = Math.random();
            }
            _this.onApply = function (effect) {
                effect.setTexture("digitalRainFont", _this._digitalRainFontTexture);
                effect.setFloat4("digitalRainFontInfos", _this._digitalRainFontTexture.charSize, characterSet.length, textureSize.width, textureSize.height);
                effect.setFloat4("digitalRainOptions", _this.width, _this.height, _this.mixToNormal, _this.mixToTile);
                effect.setMatrix("matrixSpeed", matrix);
                alpha += 0.003;
                cosTimeZeroOne = alpha;
                effect.setFloat('cosTimeZeroOne', cosTimeZeroOne);
            };
            return _this;
        }
        return DigitalRainPostProcess;
    }(BABYLON.PostProcess));
    BABYLON.DigitalRainPostProcess = DigitalRainPostProcess;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.digitalRainPostProcess.js.map

BABYLON.Effect.ShadersStore['digitalrainPixelShader'] = "\nvarying vec2 vUV;\nuniform sampler2D textureSampler;\nuniform sampler2D digitalRainFont;\n\nuniform vec4 digitalRainFontInfos;\nuniform vec4 digitalRainOptions;\nuniform mat4 matrixSpeed;\nuniform float cosTimeZeroOne;\n\nfloat getLuminance(vec3 color)\n{\nreturn clamp(dot(color,vec3(0.2126,0.7152,0.0722)),0.,1.);\n}\n\nvoid main(void) \n{\nfloat caracterSize=digitalRainFontInfos.x;\nfloat numChar=digitalRainFontInfos.y-1.0;\nfloat fontx=digitalRainFontInfos.z;\nfloat fonty=digitalRainFontInfos.w;\nfloat screenx=digitalRainOptions.x;\nfloat screeny=digitalRainOptions.y;\nfloat ratio=screeny/fonty;\nfloat columnx=float(floor((gl_FragCoord.x)/caracterSize));\nfloat tileX=float(floor((gl_FragCoord.x)/caracterSize))*caracterSize/screenx;\nfloat tileY=float(floor((gl_FragCoord.y)/caracterSize))*caracterSize/screeny;\nvec2 tileUV=vec2(tileX,tileY);\nvec4 tileColor=texture2D(textureSampler,tileUV);\nvec4 baseColor=texture2D(textureSampler,vUV);\nfloat tileLuminance=getLuminance(tileColor.rgb);\nint st=int(mod(columnx,4.0));\nfloat speed=cosTimeZeroOne*(sin(tileX*314.5)*0.5+0.6); \nfloat x=float(mod(gl_FragCoord.x,caracterSize))/fontx;\nfloat y=float(mod(speed+gl_FragCoord.y/screeny,1.0));\ny*=ratio;\nvec4 finalColor=texture2D(digitalRainFont,vec2(x,1.0-y));\nvec3 high=finalColor.rgb*(vec3(1.2,1.2,1.2)*pow(1.0-y,30.0));\nfinalColor.rgb*=vec3(pow(tileLuminance,5.0),pow(tileLuminance,1.5),pow(tileLuminance,3.0));\nfinalColor.rgb+=high;\nfinalColor.rgb=clamp(finalColor.rgb,0.,1.);\nfinalColor.a=1.0;\nfinalColor=mix(finalColor,tileColor,digitalRainOptions.w);\nfinalColor=mix(finalColor,baseColor,digitalRainOptions.z);\ngl_FragColor=finalColor;\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var BrickProceduralTexture = /** @class */ (function (_super) {
        __extends(BrickProceduralTexture, _super);
        function BrickProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            var _this = _super.call(this, name, size, "brickProceduralTexture", scene, fallbackTexture, generateMipMaps) || this;
            _this._numberOfBricksHeight = 15;
            _this._numberOfBricksWidth = 5;
            _this._jointColor = new BABYLON.Color3(0.72, 0.72, 0.72);
            _this._brickColor = new BABYLON.Color3(0.77, 0.47, 0.40);
            _this.updateShaderUniforms();
            return _this;
        }
        BrickProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("numberOfBricksHeight", this._numberOfBricksHeight);
            this.setFloat("numberOfBricksWidth", this._numberOfBricksWidth);
            this.setColor3("brickColor", this._brickColor);
            this.setColor3("jointColor", this._jointColor);
        };
        Object.defineProperty(BrickProceduralTexture.prototype, "numberOfBricksHeight", {
            get: function () {
                return this._numberOfBricksHeight;
            },
            set: function (value) {
                this._numberOfBricksHeight = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BrickProceduralTexture.prototype, "numberOfBricksWidth", {
            get: function () {
                return this._numberOfBricksWidth;
            },
            set: function (value) {
                this._numberOfBricksWidth = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BrickProceduralTexture.prototype, "jointColor", {
            get: function () {
                return this._jointColor;
            },
            set: function (value) {
                this._jointColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BrickProceduralTexture.prototype, "brickColor", {
            get: function () {
                return this._brickColor;
            },
            set: function (value) {
                this._brickColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Serializes this brick procedural texture
         * @returns a serialized brick procedural texture object
         */
        BrickProceduralTexture.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "BABYLON.BrickProceduralTexture";
            return serializationObject;
        };
        /**
         * Creates a Brick Procedural Texture from parsed brick procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing brick procedural texture information
         * @returns a parsed Brick Procedural Texture
         */
        BrickProceduralTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new BrickProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps); }, parsedTexture, scene, rootUrl);
            return texture;
        };
        __decorate([
            BABYLON.serialize()
        ], BrickProceduralTexture.prototype, "numberOfBricksHeight", null);
        __decorate([
            BABYLON.serialize()
        ], BrickProceduralTexture.prototype, "numberOfBricksWidth", null);
        __decorate([
            BABYLON.serializeAsColor3()
        ], BrickProceduralTexture.prototype, "jointColor", null);
        __decorate([
            BABYLON.serializeAsColor3()
        ], BrickProceduralTexture.prototype, "brickColor", null);
        return BrickProceduralTexture;
    }(BABYLON.ProceduralTexture));
    BABYLON.BrickProceduralTexture = BrickProceduralTexture;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.brickProceduralTexture.js.map

BABYLON.Effect.ShadersStore['brickProceduralTexturePixelShader'] = "precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float numberOfBricksHeight;\nuniform float numberOfBricksWidth;\nuniform vec3 brickColor;\nuniform vec3 jointColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nfloat roundF(float number){\nreturn sign(number)*floor(abs(number)+0.5);\n}\nvoid main(void)\n{\nfloat brickW=1.0/numberOfBricksWidth;\nfloat brickH=1.0/numberOfBricksHeight;\nfloat jointWPercentage=0.01;\nfloat jointHPercentage=0.05;\nvec3 color=brickColor;\nfloat yi=vUV.y/brickH;\nfloat nyi=roundF(yi);\nfloat xi=vUV.x/brickW;\nif (mod(floor(yi),2.0) == 0.0){\nxi=xi-0.5;\n}\nfloat nxi=roundF(xi);\nvec2 brickvUV=vec2((xi-floor(xi))/brickH,(yi-floor(yi))/brickW);\nif (yi<nyi+jointHPercentage && yi>nyi-jointHPercentage){\ncolor=mix(jointColor,vec3(0.37,0.25,0.25),(yi-nyi)/jointHPercentage+0.2);\n}\nelse if (xi<nxi+jointWPercentage && xi>nxi-jointWPercentage){\ncolor=mix(jointColor,vec3(0.44,0.44,0.44),(xi-nxi)/jointWPercentage+0.2);\n}\nelse {\nfloat brickColorSwitch=mod(floor(yi)+floor(xi),3.0);\nif (brickColorSwitch == 0.0)\ncolor=mix(color,vec3(0.33,0.33,0.33),0.3);\nelse if (brickColorSwitch == 2.0)\ncolor=mix(color,vec3(0.11,0.11,0.11),0.3);\n}\ngl_FragColor=vec4(color,1.0);\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var CloudProceduralTexture = /** @class */ (function (_super) {
        __extends(CloudProceduralTexture, _super);
        function CloudProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            var _this = _super.call(this, name, size, "cloudProceduralTexture", scene, fallbackTexture, generateMipMaps) || this;
            _this._skyColor = new BABYLON.Color4(0.15, 0.68, 1.0, 1.0);
            _this._cloudColor = new BABYLON.Color4(1, 1, 1, 1.0);
            _this.updateShaderUniforms();
            return _this;
        }
        CloudProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setColor4("skyColor", this._skyColor);
            this.setColor4("cloudColor", this._cloudColor);
        };
        Object.defineProperty(CloudProceduralTexture.prototype, "skyColor", {
            get: function () {
                return this._skyColor;
            },
            set: function (value) {
                this._skyColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CloudProceduralTexture.prototype, "cloudColor", {
            get: function () {
                return this._cloudColor;
            },
            set: function (value) {
                this._cloudColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Serializes this cloud procedural texture
         * @returns a serialized cloud procedural texture object
         */
        CloudProceduralTexture.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "BABYLON.CloudProceduralTexture";
            return serializationObject;
        };
        /**
         * Creates a Cloud Procedural Texture from parsed cloud procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing cloud procedural texture information
         * @returns a parsed Cloud Procedural Texture
         */
        CloudProceduralTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new CloudProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps); }, parsedTexture, scene, rootUrl);
            return texture;
        };
        __decorate([
            BABYLON.serializeAsColor4()
        ], CloudProceduralTexture.prototype, "skyColor", null);
        __decorate([
            BABYLON.serializeAsColor4()
        ], CloudProceduralTexture.prototype, "cloudColor", null);
        return CloudProceduralTexture;
    }(BABYLON.ProceduralTexture));
    BABYLON.CloudProceduralTexture = CloudProceduralTexture;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.cloudProceduralTexture.js.map

BABYLON.Effect.ShadersStore['cloudProceduralTexturePixelShader'] = "precision highp float;\nvarying vec2 vUV;\nuniform vec4 skyColor;\nuniform vec4 cloudColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main() {\nvec2 p=vUV*12.0;\nvec4 c=mix(skyColor,cloudColor,fbm(p));\ngl_FragColor=c;\n}\n";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var FireProceduralTexture = /** @class */ (function (_super) {
        __extends(FireProceduralTexture, _super);
        function FireProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            var _this = _super.call(this, name, size, "fireProceduralTexture", scene, fallbackTexture, generateMipMaps) || this;
            _this._time = 0.0;
            _this._speed = new BABYLON.Vector2(0.5, 0.3);
            _this._autoGenerateTime = true;
            _this._alphaThreshold = 0.5;
            _this._fireColors = FireProceduralTexture.RedFireColors;
            _this.updateShaderUniforms();
            return _this;
        }
        FireProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("time", this._time);
            this.setVector2("speed", this._speed);
            this.setColor3("c1", this._fireColors[0]);
            this.setColor3("c2", this._fireColors[1]);
            this.setColor3("c3", this._fireColors[2]);
            this.setColor3("c4", this._fireColors[3]);
            this.setColor3("c5", this._fireColors[4]);
            this.setColor3("c6", this._fireColors[5]);
            this.setFloat("alphaThreshold", this._alphaThreshold);
        };
        FireProceduralTexture.prototype.render = function (useCameraPostProcess) {
            var scene = this.getScene();
            if (this._autoGenerateTime && scene) {
                this._time += scene.getAnimationRatio() * 0.03;
                this.updateShaderUniforms();
            }
            _super.prototype.render.call(this, useCameraPostProcess);
        };
        Object.defineProperty(FireProceduralTexture, "PurpleFireColors", {
            get: function () {
                return [
                    new BABYLON.Color3(0.5, 0.0, 1.0),
                    new BABYLON.Color3(0.9, 0.0, 1.0),
                    new BABYLON.Color3(0.2, 0.0, 1.0),
                    new BABYLON.Color3(1.0, 0.9, 1.0),
                    new BABYLON.Color3(0.1, 0.1, 1.0),
                    new BABYLON.Color3(0.9, 0.9, 1.0)
                ];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FireProceduralTexture, "GreenFireColors", {
            get: function () {
                return [
                    new BABYLON.Color3(0.5, 1.0, 0.0),
                    new BABYLON.Color3(0.5, 1.0, 0.0),
                    new BABYLON.Color3(0.3, 0.4, 0.0),
                    new BABYLON.Color3(0.5, 1.0, 0.0),
                    new BABYLON.Color3(0.2, 0.0, 0.0),
                    new BABYLON.Color3(0.5, 1.0, 0.0)
                ];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FireProceduralTexture, "RedFireColors", {
            get: function () {
                return [
                    new BABYLON.Color3(0.5, 0.0, 0.1),
                    new BABYLON.Color3(0.9, 0.0, 0.0),
                    new BABYLON.Color3(0.2, 0.0, 0.0),
                    new BABYLON.Color3(1.0, 0.9, 0.0),
                    new BABYLON.Color3(0.1, 0.1, 0.1),
                    new BABYLON.Color3(0.9, 0.9, 0.9)
                ];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FireProceduralTexture, "BlueFireColors", {
            get: function () {
                return [
                    new BABYLON.Color3(0.1, 0.0, 0.5),
                    new BABYLON.Color3(0.0, 0.0, 0.5),
                    new BABYLON.Color3(0.1, 0.0, 0.2),
                    new BABYLON.Color3(0.0, 0.0, 1.0),
                    new BABYLON.Color3(0.1, 0.2, 0.3),
                    new BABYLON.Color3(0.0, 0.2, 0.9)
                ];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FireProceduralTexture.prototype, "autoGenerateTime", {
            get: function () {
                return this._autoGenerateTime;
            },
            set: function (value) {
                this._autoGenerateTime = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FireProceduralTexture.prototype, "fireColors", {
            get: function () {
                return this._fireColors;
            },
            set: function (value) {
                this._fireColors = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FireProceduralTexture.prototype, "time", {
            get: function () {
                return this._time;
            },
            set: function (value) {
                this._time = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FireProceduralTexture.prototype, "speed", {
            get: function () {
                return this._speed;
            },
            set: function (value) {
                this._speed = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FireProceduralTexture.prototype, "alphaThreshold", {
            get: function () {
                return this._alphaThreshold;
            },
            set: function (value) {
                this._alphaThreshold = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Serializes this fire procedural texture
         * @returns a serialized fire procedural texture object
         */
        FireProceduralTexture.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "BABYLON.FireProceduralTexture";
            serializationObject.fireColors = [];
            for (var i = 0; i < this._fireColors.length; i++) {
                serializationObject.fireColors.push(this._fireColors[i].asArray());
            }
            return serializationObject;
        };
        /**
         * Creates a Fire Procedural Texture from parsed fire procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing fire procedural texture information
         * @returns a parsed Fire Procedural Texture
         */
        FireProceduralTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new FireProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps); }, parsedTexture, scene, rootUrl);
            var colors = [];
            for (var i = 0; i < parsedTexture.fireColors.length; i++) {
                colors.push(BABYLON.Color3.FromArray(parsedTexture.fireColors[i]));
            }
            texture.fireColors = colors;
            return texture;
        };
        __decorate([
            BABYLON.serialize()
        ], FireProceduralTexture.prototype, "autoGenerateTime", null);
        __decorate([
            BABYLON.serialize()
        ], FireProceduralTexture.prototype, "time", null);
        __decorate([
            BABYLON.serializeAsVector2()
        ], FireProceduralTexture.prototype, "speed", null);
        __decorate([
            BABYLON.serialize()
        ], FireProceduralTexture.prototype, "alphaThreshold", null);
        return FireProceduralTexture;
    }(BABYLON.ProceduralTexture));
    BABYLON.FireProceduralTexture = FireProceduralTexture;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.fireProceduralTexture.js.map

BABYLON.Effect.ShadersStore['fireProceduralTexturePixelShader'] = "precision highp float;\nuniform float time;\nuniform vec3 c1;\nuniform vec3 c2;\nuniform vec3 c3;\nuniform vec3 c4;\nuniform vec3 c5;\nuniform vec3 c6;\nuniform vec2 speed;\nuniform float shift;\nuniform float alphaThreshold;\nvarying vec2 vUV;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main() {\nvec2 p=vUV*8.0;\nfloat q=fbm(p-time*0.1);\nvec2 r=vec2(fbm(p+q+time*speed.x-p.x-p.y),fbm(p+q-time*speed.y));\nvec3 c=mix(c1,c2,fbm(p+r))+mix(c3,c4,r.x)-mix(c5,c6,r.y);\nvec3 color=c*cos(shift*vUV.y);\nfloat luminance=dot(color.rgb,vec3(0.3,0.59,0.11));\ngl_FragColor=vec4(color,luminance*alphaThreshold+(1.0-alphaThreshold));\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var GrassProceduralTexture = /** @class */ (function (_super) {
        __extends(GrassProceduralTexture, _super);
        function GrassProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            var _this = _super.call(this, name, size, "grassProceduralTexture", scene, fallbackTexture, generateMipMaps) || this;
            _this._groundColor = new BABYLON.Color3(1, 1, 1);
            _this._grassColors = [
                new BABYLON.Color3(0.29, 0.38, 0.02),
                new BABYLON.Color3(0.36, 0.49, 0.09),
                new BABYLON.Color3(0.51, 0.6, 0.28)
            ];
            _this.updateShaderUniforms();
            return _this;
        }
        GrassProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setColor3("herb1Color", this._grassColors[0]);
            this.setColor3("herb2Color", this._grassColors[1]);
            this.setColor3("herb3Color", this._grassColors[2]);
            this.setColor3("groundColor", this._groundColor);
        };
        Object.defineProperty(GrassProceduralTexture.prototype, "grassColors", {
            get: function () {
                return this._grassColors;
            },
            set: function (value) {
                this._grassColors = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GrassProceduralTexture.prototype, "groundColor", {
            get: function () {
                return this._groundColor;
            },
            set: function (value) {
                this._groundColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Serializes this grass procedural texture
         * @returns a serialized grass procedural texture object
         */
        GrassProceduralTexture.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "BABYLON.GrassProceduralTexture";
            serializationObject.grassColors = [];
            for (var i = 0; i < this._grassColors.length; i++) {
                serializationObject.grassColors.push(this._grassColors[i].asArray());
            }
            return serializationObject;
        };
        /**
         * Creates a Grass Procedural Texture from parsed grass procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing grass procedural texture information
         * @returns a parsed Grass Procedural Texture
         */
        GrassProceduralTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new GrassProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps); }, parsedTexture, scene, rootUrl);
            var colors = [];
            for (var i = 0; i < parsedTexture.grassColors.length; i++) {
                colors.push(BABYLON.Color3.FromArray(parsedTexture.grassColors[i]));
            }
            texture.grassColors = colors;
            return texture;
        };
        __decorate([
            BABYLON.serializeAsColor3()
        ], GrassProceduralTexture.prototype, "groundColor", null);
        return GrassProceduralTexture;
    }(BABYLON.ProceduralTexture));
    BABYLON.GrassProceduralTexture = GrassProceduralTexture;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.grassProceduralTexture.js.map

BABYLON.Effect.ShadersStore['grassProceduralTexturePixelShader'] = "precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform vec3 herb1Color;\nuniform vec3 herb2Color;\nuniform vec3 herb3Color;\nuniform vec3 groundColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main(void) {\nvec3 color=mix(groundColor,herb1Color,rand(gl_FragCoord.xy*4.0));\ncolor=mix(color,herb2Color,rand(gl_FragCoord.xy*8.0));\ncolor=mix(color,herb3Color,rand(gl_FragCoord.xy));\ncolor=mix(color,herb1Color,fbm(gl_FragCoord.xy*16.0));\ngl_FragColor=vec4(color,1.0);\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var MarbleProceduralTexture = /** @class */ (function (_super) {
        __extends(MarbleProceduralTexture, _super);
        function MarbleProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            var _this = _super.call(this, name, size, "marbleProceduralTexture", scene, fallbackTexture, generateMipMaps) || this;
            _this._numberOfTilesHeight = 3;
            _this._numberOfTilesWidth = 3;
            _this._amplitude = 9.0;
            _this._jointColor = new BABYLON.Color3(0.72, 0.72, 0.72);
            _this.updateShaderUniforms();
            return _this;
        }
        MarbleProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("numberOfTilesHeight", this._numberOfTilesHeight);
            this.setFloat("numberOfTilesWidth", this._numberOfTilesWidth);
            this.setFloat("amplitude", this._amplitude);
            this.setColor3("jointColor", this._jointColor);
        };
        Object.defineProperty(MarbleProceduralTexture.prototype, "numberOfTilesHeight", {
            get: function () {
                return this._numberOfTilesHeight;
            },
            set: function (value) {
                this._numberOfTilesHeight = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MarbleProceduralTexture.prototype, "amplitude", {
            get: function () {
                return this._amplitude;
            },
            set: function (value) {
                this._amplitude = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MarbleProceduralTexture.prototype, "numberOfTilesWidth", {
            get: function () {
                return this._numberOfTilesWidth;
            },
            set: function (value) {
                this._numberOfTilesWidth = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MarbleProceduralTexture.prototype, "jointColor", {
            get: function () {
                return this._jointColor;
            },
            set: function (value) {
                this._jointColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Serializes this marble procedural texture
         * @returns a serialized marble procedural texture object
         */
        MarbleProceduralTexture.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "BABYLON.MarbleProceduralTexture";
            return serializationObject;
        };
        /**
         * Creates a Marble Procedural Texture from parsed marble procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing marble procedural texture information
         * @returns a parsed Marble Procedural Texture
         */
        MarbleProceduralTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new MarbleProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps); }, parsedTexture, scene, rootUrl);
            return texture;
        };
        __decorate([
            BABYLON.serialize()
        ], MarbleProceduralTexture.prototype, "numberOfTilesHeight", null);
        __decorate([
            BABYLON.serialize()
        ], MarbleProceduralTexture.prototype, "amplitude", null);
        __decorate([
            BABYLON.serialize()
        ], MarbleProceduralTexture.prototype, "numberOfTilesWidth", null);
        __decorate([
            BABYLON.serialize()
        ], MarbleProceduralTexture.prototype, "jointColor", null);
        return MarbleProceduralTexture;
    }(BABYLON.ProceduralTexture));
    BABYLON.MarbleProceduralTexture = MarbleProceduralTexture;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.marbleProceduralTexture.js.map

BABYLON.Effect.ShadersStore['marbleProceduralTexturePixelShader'] = "precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float numberOfTilesHeight;\nuniform float numberOfTilesWidth;\nuniform float amplitude;\nuniform vec3 marbleColor;\nuniform vec3 jointColor;\nconst vec3 tileSize=vec3(1.1,1.0,1.1);\nconst vec3 tilePct=vec3(0.98,1.0,0.98);\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat turbulence(vec2 P)\n{\nfloat val=0.0;\nfloat freq=1.0;\nfor (int i=0; i<4; i++)\n{\nval+=abs(noise(P*freq)/freq);\nfreq*=2.07;\n}\nreturn val;\n}\nfloat roundF(float number){\nreturn sign(number)*floor(abs(number)+0.5);\n}\nvec3 marble_color(float x)\n{\nvec3 col;\nx=0.5*(x+1.);\nx=sqrt(x); \nx=sqrt(x);\nx=sqrt(x);\ncol=vec3(.2+.75*x); \ncol.b*=0.95; \nreturn col;\n}\nvoid main()\n{\nfloat brickW=1.0/numberOfTilesWidth;\nfloat brickH=1.0/numberOfTilesHeight;\nfloat jointWPercentage=0.01;\nfloat jointHPercentage=0.01;\nvec3 color=marbleColor;\nfloat yi=vUV.y/brickH;\nfloat nyi=roundF(yi);\nfloat xi=vUV.x/brickW;\nif (mod(floor(yi),2.0) == 0.0){\nxi=xi-0.5;\n}\nfloat nxi=roundF(xi);\nvec2 brickvUV=vec2((xi-floor(xi))/brickH,(yi-floor(yi))/brickW);\nif (yi<nyi+jointHPercentage && yi>nyi-jointHPercentage){\ncolor=mix(jointColor,vec3(0.37,0.25,0.25),(yi-nyi)/jointHPercentage+0.2);\n}\nelse if (xi<nxi+jointWPercentage && xi>nxi-jointWPercentage){\ncolor=mix(jointColor,vec3(0.44,0.44,0.44),(xi-nxi)/jointWPercentage+0.2);\n}\nelse {\nfloat t=6.28*brickvUV.x/(tileSize.x+noise(vec2(vUV)*6.0));\nt+=amplitude*turbulence(brickvUV.xy);\nt=sin(t);\ncolor=marble_color(t);\n}\ngl_FragColor=vec4(color,0.0);\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var RoadProceduralTexture = /** @class */ (function (_super) {
        __extends(RoadProceduralTexture, _super);
        function RoadProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            var _this = _super.call(this, name, size, "roadProceduralTexture", scene, fallbackTexture, generateMipMaps) || this;
            _this._roadColor = new BABYLON.Color3(0.53, 0.53, 0.53);
            _this.updateShaderUniforms();
            return _this;
        }
        RoadProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setColor3("roadColor", this._roadColor);
        };
        Object.defineProperty(RoadProceduralTexture.prototype, "roadColor", {
            get: function () {
                return this._roadColor;
            },
            set: function (value) {
                this._roadColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Serializes this road procedural texture
         * @returns a serialized road procedural texture object
         */
        RoadProceduralTexture.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "BABYLON.RoadProceduralTexture";
            return serializationObject;
        };
        /**
         * Creates a Road Procedural Texture from parsed road procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing road procedural texture information
         * @returns a parsed Road Procedural Texture
         */
        RoadProceduralTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new RoadProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps); }, parsedTexture, scene, rootUrl);
            return texture;
        };
        __decorate([
            BABYLON.serializeAsColor3()
        ], RoadProceduralTexture.prototype, "roadColor", null);
        return RoadProceduralTexture;
    }(BABYLON.ProceduralTexture));
    BABYLON.RoadProceduralTexture = RoadProceduralTexture;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.roadProceduralTexture.js.map

BABYLON.Effect.ShadersStore['roadProceduralTexturePixelShader'] = "precision highp float;\nvarying vec2 vUV; \nuniform vec3 roadColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main(void) {\nfloat ratioy=mod(gl_FragCoord.y*100.0 ,fbm(vUV*2.0));\nvec3 color=roadColor*ratioy;\ngl_FragColor=vec4(color,1.0);\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var StarfieldProceduralTexture = /** @class */ (function (_super) {
        __extends(StarfieldProceduralTexture, _super);
        function StarfieldProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            var _this = _super.call(this, name, size, "starfieldProceduralTexture", scene, fallbackTexture, generateMipMaps) || this;
            _this._time = 1;
            _this._alpha = 0.5;
            _this._beta = 0.8;
            _this._zoom = 0.8;
            _this._formuparam = 0.53;
            _this._stepsize = 0.1;
            _this._tile = 0.850;
            _this._brightness = 0.0015;
            _this._darkmatter = 0.400;
            _this._distfading = 0.730;
            _this._saturation = 0.850;
            _this.updateShaderUniforms();
            return _this;
        }
        StarfieldProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("time", this._time);
            this.setFloat("alpha", this._alpha);
            this.setFloat("beta", this._beta);
            this.setFloat("zoom", this._zoom);
            this.setFloat("formuparam", this._formuparam);
            this.setFloat("stepsize", this._stepsize);
            this.setFloat("tile", this._tile);
            this.setFloat("brightness", this._brightness);
            this.setFloat("darkmatter", this._darkmatter);
            this.setFloat("distfading", this._distfading);
            this.setFloat("saturation", this._saturation);
        };
        Object.defineProperty(StarfieldProceduralTexture.prototype, "time", {
            get: function () {
                return this._time;
            },
            set: function (value) {
                this._time = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "alpha", {
            get: function () {
                return this._alpha;
            },
            set: function (value) {
                this._alpha = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "beta", {
            get: function () {
                return this._beta;
            },
            set: function (value) {
                this._beta = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "formuparam", {
            get: function () {
                return this._formuparam;
            },
            set: function (value) {
                this._formuparam = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "stepsize", {
            get: function () {
                return this._stepsize;
            },
            set: function (value) {
                this._stepsize = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "zoom", {
            get: function () {
                return this._zoom;
            },
            set: function (value) {
                this._zoom = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "tile", {
            get: function () {
                return this._tile;
            },
            set: function (value) {
                this._tile = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "brightness", {
            get: function () {
                return this._brightness;
            },
            set: function (value) {
                this._brightness = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "darkmatter", {
            get: function () {
                return this._darkmatter;
            },
            set: function (value) {
                this._darkmatter = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "distfading", {
            get: function () {
                return this._distfading;
            },
            set: function (value) {
                this._distfading = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StarfieldProceduralTexture.prototype, "saturation", {
            get: function () {
                return this._saturation;
            },
            set: function (value) {
                this._saturation = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Serializes this starfield procedural texture
         * @returns a serialized starfield procedural texture object
         */
        StarfieldProceduralTexture.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "BABYLON.StarfieldProceduralTexture";
            return serializationObject;
        };
        /**
         * Creates a Starfield Procedural Texture from parsed startfield procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing startfield procedural texture information
         * @returns a parsed Starfield Procedural Texture
         */
        StarfieldProceduralTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new StarfieldProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps); }, parsedTexture, scene, rootUrl);
            return texture;
        };
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "time", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "alpha", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "beta", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "formuparam", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "stepsize", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "zoom", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "tile", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "brightness", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "darkmatter", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "distfading", null);
        __decorate([
            BABYLON.serialize()
        ], StarfieldProceduralTexture.prototype, "saturation", null);
        return StarfieldProceduralTexture;
    }(BABYLON.ProceduralTexture));
    BABYLON.StarfieldProceduralTexture = StarfieldProceduralTexture;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.starfieldProceduralTexture.js.map

BABYLON.Effect.ShadersStore['starfieldProceduralTexturePixelShader'] = "precision highp float;\n\n#define volsteps 20\n#define iterations 15\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float time;\nuniform float alpha;\nuniform float beta;\nuniform float zoom;\nuniform float formuparam;\nuniform float stepsize;\nuniform float tile;\nuniform float brightness;\nuniform float darkmatter;\nuniform float distfading;\nuniform float saturation;\nvoid main()\n{\nvec3 dir=vec3(vUV*zoom,1.);\nfloat localTime=time*0.0001;\n\nmat2 rot1=mat2(cos(alpha),sin(alpha),-sin(alpha),cos(alpha));\nmat2 rot2=mat2(cos(beta),sin(beta),-sin(beta),cos(beta));\ndir.xz*=rot1;\ndir.xy*=rot2;\nvec3 from=vec3(1.,.5,0.5);\nfrom+=vec3(-2.,localTime*2.,localTime);\nfrom.xz*=rot1;\nfrom.xy*=rot2;\n\nfloat s=0.1,fade=1.;\nvec3 v=vec3(0.);\nfor (int r=0; r<volsteps; r++) {\nvec3 p=from+s*dir*.5;\np=abs(vec3(tile)-mod(p,vec3(tile*2.))); \nfloat pa,a=pa=0.;\nfor (int i=0; i<iterations; i++) {\np=abs(p)/dot(p,p)-formuparam; \na+=abs(length(p)-pa); \npa=length(p);\n}\nfloat dm=max(0.,darkmatter-a*a*.001); \na*=a*a; \nif (r>6) fade*=1.-dm; \n\nv+=fade;\nv+=vec3(s,s*s,s*s*s*s)*a*brightness*fade; \nfade*=distfading; \ns+=stepsize;\n}\nv=mix(vec3(length(v)),v,saturation); \ngl_FragColor=vec4(v*.01,1.);\n}";


/// <reference path="../../../dist/preview release/babylon.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var WoodProceduralTexture = /** @class */ (function (_super) {
        __extends(WoodProceduralTexture, _super);
        function WoodProceduralTexture(name, size, scene, fallbackTexture, generateMipMaps) {
            var _this = _super.call(this, name, size, "woodProceduralTexture", scene, fallbackTexture, generateMipMaps) || this;
            _this._ampScale = 100.0;
            _this._woodColor = new BABYLON.Color3(0.32, 0.17, 0.09);
            _this.updateShaderUniforms();
            return _this;
        }
        WoodProceduralTexture.prototype.updateShaderUniforms = function () {
            this.setFloat("ampScale", this._ampScale);
            this.setColor3("woodColor", this._woodColor);
        };
        Object.defineProperty(WoodProceduralTexture.prototype, "ampScale", {
            get: function () {
                return this._ampScale;
            },
            set: function (value) {
                this._ampScale = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(WoodProceduralTexture.prototype, "woodColor", {
            get: function () {
                return this._woodColor;
            },
            set: function (value) {
                this._woodColor = value;
                this.updateShaderUniforms();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Serializes this wood procedural texture
         * @returns a serialized wood procedural texture object
         */
        WoodProceduralTexture.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this, _super.prototype.serialize.call(this));
            serializationObject.customType = "BABYLON.WoodProceduralTexture";
            return serializationObject;
        };
        /**
         * Creates a Wood Procedural Texture from parsed wood procedural texture data
         * @param parsedTexture defines parsed texture data
         * @param scene defines the current scene
         * @param rootUrl defines the root URL containing wood procedural texture information
         * @returns a parsed Wood Procedural Texture
         */
        WoodProceduralTexture.Parse = function (parsedTexture, scene, rootUrl) {
            var texture = BABYLON.SerializationHelper.Parse(function () { return new WoodProceduralTexture(parsedTexture.name, parsedTexture._size, scene, undefined, parsedTexture._generateMipMaps); }, parsedTexture, scene, rootUrl);
            return texture;
        };
        __decorate([
            BABYLON.serialize()
        ], WoodProceduralTexture.prototype, "ampScale", null);
        __decorate([
            BABYLON.serializeAsColor3()
        ], WoodProceduralTexture.prototype, "woodColor", null);
        return WoodProceduralTexture;
    }(BABYLON.ProceduralTexture));
    BABYLON.WoodProceduralTexture = WoodProceduralTexture;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.woodProceduralTexture.js.map

BABYLON.Effect.ShadersStore['woodProceduralTexturePixelShader'] = "precision highp float;\nvarying vec2 vPosition;\nvarying vec2 vUV;\nuniform float ampScale;\nuniform vec3 woodColor;\nfloat rand(vec2 n) {\nreturn fract(cos(dot(n,vec2(12.9898,4.1414)))*43758.5453);\n}\nfloat noise(vec2 n) {\nconst vec2 d=vec2(0.0,1.0);\nvec2 b=floor(n),f=smoothstep(vec2(0.0),vec2(1.0),fract(n));\nreturn mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);\n}\nfloat fbm(vec2 n) {\nfloat total=0.0,amplitude=1.0;\nfor (int i=0; i<4; i++) {\ntotal+=noise(n)*amplitude;\nn+=n;\namplitude*=0.5;\n}\nreturn total;\n}\nvoid main(void) {\nfloat ratioy=mod(vUV.x*ampScale,2.0+fbm(vUV*0.8));\nvec3 wood=woodColor*ratioy;\ngl_FragColor=vec4(wood,1.0);\n}";