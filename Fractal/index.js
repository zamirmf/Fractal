//UI values -- From UI to JS only
class UIValues{
  //Static getters and setters
  static get recursionDepth(){
    return document.querySelector("#recursion-depth").value;
  }

  static get branchAmount(){
    return document.querySelector("#branch-amount").value;
  }

  static get rotationSpeed(){
    return this._rotationSpeed ? this._rotationSpeed : document.querySelector("#rotation-speed").value;
  }

  static set rotationSpeed(speed){
    this._rotationSpeed = speed;
  }
}

//Branch Class -- Extends the Mesh class to support recursive additions of child nodes in a tree-branch fashion
class Branch extends THREE.Mesh{
  //Methods
  addRecursiveBranches( numberOfBranches, recursionFactor){
    //Stop condition for the recursion
    if (recursionFactor < 0) {return;}
    //Height and Radius will be shorter for the children Branches
    const height = this.geometry.parameters.height * 0.5;
    const radius = this.geometry.parameters.radiusTop * 0.8;
    const geometry = new THREE.CylinderGeometry( radius, radius, height, 10, 1, false);
    for(var i = 0; i < numberOfBranches; i++){
      //Determines how far in the parent branch the child branch will be attached +- 90%
      const offset = ((i/numberOfBranches) * 1.8) - 0.9;
      //Determines the rotation angle which will be switching from side to side +- 60 degrees
      const evenNumber = i%2 === 0;
      const rotationAngle = evenNumber ? -Math.PI / 3.0 : Math.PI / 3.0;
      var vec = this.up.clone();
      //Places the new branch in respective position to its parent
      var branch = new Branch( geometry, this.material );
      branch.translateOnAxis(vec, height * offset );
      //Rotates and translate the new branch to it is final position
      vec.applyAxisAngle(zVector, rotationAngle);
      branch.translateOnAxis(vec, height / 2.0 );
      branch.rotateOnAxis(zVector, rotationAngle);
      //Adds the new branch to its parent
      this.add(branch);
    }
    //Recursive call to each child
    for(var i=0; i < this.children.length; i++){
      this.children[i].addRecursiveBranches(numberOfBranches, recursionFactor-1);
    }
  }
}

//Fractal Class -- Uses Three.js to draw into a html canvas within the dom element passed in the constructor
class Fractal{
  constructor(selector){
    this.initializeRenderer(selector);
    this.initializeCamera();
    this.initializeScene();
    this.initializeLight(); 
    this.initializeGeometry();
  }

  //Methods
  initializeScene(){
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFFFFFF);
  }

  initializeRenderer(selector){
    var domElement = document.querySelector(selector);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize( domElement.clientWidth, domElement.clientHeight );
    domElement.appendChild( this.renderer.domElement );
  }

  initializeCamera(){
    this.camera = new THREE.PerspectiveCamera( 90, this.aspectRatio, 0.1, 100 );
    this.camera.lookAt(new THREE.Vector3(0,0,0));
    this.camera.position.z = 3.5;
  }

  initializeLight(){
    var light = new THREE.PointLight(0xFFFF00);
    light.position.set(2, 2, 5);
    this.scene.add(light);
  }

  initializeGeometry(){
    this.initialCylinderHeight = 5.0;
    this.initialCylinderRadius = 0.04;
    this.material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
    this.createTrunkWithBranches();
  }
  
  resetGeometry(){
    //Removes the trunk and its children
    var trunk = this.scene.getObjectByProperty("type","Mesh");
    this.scene.remove(trunk);

    //Regenerate the trunk and its recursive branches with the new settings
    this.createTrunkWithBranches();
  }

  createTrunkWithBranches(){
    //Create the first branch as the trunk
    var geometry = new THREE.CylinderGeometry( this.initialCylinderRadius, this.initialCylinderRadius, this.initialCylinderHeight);
    var trunk = new Branch( geometry, this.material );
    this.scene.add( trunk );

    //Create branches recursively
    trunk.addRecursiveBranches(UIValues.branchAmount,UIValues.recursionDepth-1);
  }

  //Recursive method which applies rotation to each Branch object
  applyRotation(parent){
    const rotationAngle = UIValues.rotationSpeed;
    for(var i =0; i < parent.children.length; i++){
      if (parent.children[i].type !== "Mesh") {continue;}
      this.applyRotation(parent.children[i]);
      const evenNumber = i%2 === 0;
      parent.children[i].rotateOnAxis(evenNumber? yVector : negativeYVector, rotationAngle);
    }
  }

  animate(){
    this.applyRotation(this.scene);
    this.render();
  }

  render(){
    this.renderer.render( this.scene, this.camera );
  }

  //Getters and Setters
  get aspectRatio(){
    return this.renderer.getSize().width / this.renderer.getSize().height;
  }
}

//Global variables
var fractal = null;
var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var yVector = new THREE.Vector3(0, 1, 0);
var negativeYVector = new THREE.Vector3(0, -1, 0);
var zVector = new THREE.Vector3(0,0,1);

//---------Events-----------

document.addEventListener("DOMContentLoaded", function(){
  //Initializes fractal object
  fractal = new Fractal("#fractal-container");
  
  //Adds event handlers
  document.querySelector("#fractal-container canvas").onclick = MouseClick;
  document.querySelector("#branch-amount").onchange = UIChanged;
  document.querySelector("#recursion-depth").onchange = UIChanged;
  document.querySelector("#rotation-speed").onchange = RotationSpeedChanged;
  
  //Animation 'Loop'
  function animate(){
    requestAnimationFrame(animate);
    fractal.animate();
  }
  animate();
});

function MouseClick(event){
  event.stopPropagation();

  //Correct coordinates and normalize
  mouse.x = ( (event.clientX - event.currentTarget.offsetLeft) / event.currentTarget.clientWidth ) * 2 - 1;
  mouse.y = - ( (event.clientY - event.currentTarget.offsetTop) / event.currentTarget.clientHeight ) * 2 + 1;

  //Updates one or more branches if any
  raycaster.setFromCamera( mouse, fractal.camera );
  var intersects = raycaster.intersectObjects( fractal.scene.children, true );
  for ( var i = 0; i < intersects.length; i++ ) {
    intersects[i].object.addRecursiveBranches(UIValues.branchAmount, UIValues.recursionDepth - 1);
  } 

  //Render the scene without animation
  fractal.render();
}

function UIChanged(event){
  //Reset geometry which is going to be generated based on the new settings -- UI
  fractal.resetGeometry();
}

function RotationSpeedChanged(event){
  //Update rotation speed to be used by the next animation loop
  UIValues.rotationSpeed = document.querySelector("#rotation-speed").value;
}