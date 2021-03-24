import React, { useState } from 'react'
import bridge from '@vkontakte/vk-bridge'

function RemoveBtn(props){
  return(
    <button className="remove_btn" onClick={props.OnClick}>
      Remove
    </button>
  );
}

function Add(props){
  const [value, setValue] = useState()
  return(
    <form onSubmit={(event)=>{event.preventDefault(); props.OnSubmit(value); setValue('')}}>
      <input type='text' name='item' value={value} onChange={(event)=>setValue(event.target.value)}></input>
      <input type='submit' value='Add' className="add_btn"/>
    </form> 
  )
}

function Save(props){
  return(
    <form onSubmit={(event)=>{event.preventDefault(); props.OnSubmit()}}>
      <input type='submit' value='Save' className="save_btn"/>
      {props.Saved &&
        <span>&#10003;</span>
      }
    </form>
  )
}

class Item extends React.Component{
  render(){
    return (
      <div className="todo-item">
        <input type='checkbox' checked={this.props.checked} onChange={()=>this.props.OnCheck(!this.props.checked, this.props.index)} key={this.props.index}/>
        {this.props.value}
      </div>
    );
  }
}

class TodoList extends React.Component{ 
  constructor(props){
    super(props);

    var item_list = this.props.items;
    var count = 0;

    item_list.forEach((value, index)=>{
      var checked = value[1]
      if(checked)
        count+=1;
    });

    this.state = {
      items: item_list,
      count: count,
      saveFunc: props.saveFunc,
      saved: true
    }
  }
  
  makeItem(value, index, checked){
    return(<Item index={index} value={value} checked={checked} OnCheck={(check, i)=>this.handleCheck(check, i)}/>)
  }

  handleRemove(index){
    var updated = this.state.items

    if(updated[index][1]){
      var d_count = this.state.count -1;
      this.setState({count: d_count})
    }

    updated.splice(index, 1)
    this.setState({items: updated, saved: false})
  }

  handleAdd(text){
    var updated = this.state.items
    updated.push([text, false])
    this.setState({items: updated, saved: false})
  }

  handleCheck(checked, index){
    var items = this.state.items
    var u_count = this.state.count

    if(checked){
      items[index][1] = true
      u_count += 1;
    }else{
      items[index][1] = false
      u_count -= 1; 
    }
    this.setState({count: u_count, item_list: items, saved: false});
  }

  handleSave(){
    // Returns a promise, .then can be used to set values async on response
    this.props.saveFunc(this.state.items)
      .then(result=>{
        this.setState({saved: true})
      }).catch(err=>console.log("handleSave() encountered an error"))
  }

  render(){
    return (
      <div className="todo-list">
        <h2>Complete: {this.state.count}/{this.state.items.length}</h2>
        <ul>
          {this.state.items.map((value, index) =>{
            return (<div> {this.makeItem(value[0], index, value[1])} <RemoveBtn OnClick={()=>this.handleRemove(index)}/></div>)
          })}
        </ul>
        <Add OnSubmit={(text)=>this.handleAdd(text)}/>
        <Save Saved={this.state.saved} OnSubmit={()=>this.handleSave()}/>
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props){
    super(props);
    this.server_url = "https://darkjakeco.pythonanywhere.com/"

    this.appId = '7786895'
    this.scope = 'friends'

    this.id = null
    this.access_token = null
    this.user_scope = null

    this.state = {
      error: null,
      isLoaded: false,
      items: [],
      first_name: null
    };
  }

  // Example of using VK API method, requires "friends" scope to be specified for access_token
  getFriendsList(){
    bridge.send("VKWebAppCallAPIMethod", {
      "method": "friends.get", 
      "request_id": "42", 
      "params": {
        "v": "5.130",
        "access_token": this.access_token
      }
    }).then(result=>{
      console.log("FRIENDS")
      console.log(result)
    }).catch(error=>{
      console.log(error)
    })
  }

  getTodoList(){
    fetch(this.server_url+this.id)
    .then(res => res.json())
    .then(
      (result) => {
        this.setState({
          isLoaded: true,
          items: result.list
        });
      },
      (error) => {
        this.setState({
          isLoaded: false,
          error: error
        });
      }
    )
  }

  componentDidMount(){
    // Init the VK web app with vk servers
    bridge.send("VKWebAppInit",{})

    bridge.send('VKWebAppGetUserInfo')
      .then(result=>{
        console.log("GETUSERINFO")
        this.id = result.id
        this.setState({first_name: result.first_name})

        // Get TODO list from server with proper user_id
        this.getTodoList()

        console.log(result)
      })
      .catch(error=>{
        console.log("GETUSERINFOERROR")
        console.log(error)
      })

    // Get an access_token for the current user, as for permissions in this.scope (currently "friends")
    bridge.send("VKWebAppGetAuthToken", {"app_id": parseInt(this.appId), "scope": this.scope})
      .then(result=>{
        console.log("GETAUTHINFO")
        this.access_token = result.access_token
        this.user_scope = result.scope

        this.getFriendsList()

        console.log(result)
      })
      .catch(error=>{
        console.log("GETAUTHINFOERROR")
        console.log(error)
      })
  }

  saveFunc(todo_list){
    // Send POST request to server to save updated list
    var json_list = {
      'list': todo_list
    }

    const requestOptions = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(json_list)
    };
    
    // `this.id` is the reason for the ".bind(this)" used in `render()` for saveFunc
    // otherwise `this` doesn't reference `App`
    var save_url = this.server_url+"save/"+this.id

    // Return a promise object so that the calling func can set values async with response
    return new Promise((resolve, reject)=>{
      fetch(save_url, requestOptions)
      .then(response=>{
        if(response.ok){
          resolve(true)
        }
      }).catch(
          error=>{
            console.log(error)
            reject(false)
          }
      )
    })
  }

  render(){
    const { error, isLoaded, items } = this.state;

    if(error){
      return <div>Error: {error.message}</div>;
    }else if(!isLoaded){
      return <div>Loading...</div>;
    }else{
      return (
        <div className="App">
          <header className="App-header">
          <h1>{this.state.first_name}'s TODO List</h1> 
          <TodoList saveFunc={this.saveFunc.bind(this)} items={items}/>	
          </header>
        </div>
      );
    }
  }
}

export default App;