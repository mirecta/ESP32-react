import React,{useEffect} from 'react';
import { withSnackbar, WithSnackbarProps } from 'notistack';
import { redirectingAuthorizedFetch } from '../authentication';
import io from 'socket.io-client';

const SERVER_URL = 'http://localhost:8888';

export interface RestControllerProps<D> extends WithSnackbarProps {
  handleValueChange: (name: keyof D, doNow?:boolean) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckboxChange: (name: keyof D,doNow?:boolean ) => (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  handleSliderChange: (name: keyof D, doNow?:boolean) => (event: React.ChangeEvent<{}>, value: number | number[]) => void;

  setData: (data: D) => void;
  saveData: () => void;
  loadData: () => void;
  connectSocket: () => void;

  data?: D;
  loading: boolean;
  errorMessage?: string;
}

interface RestControllerState<D> {
  data?: D;
  loading: boolean;
  errorMessage?: string;
}

export function restController<D, P extends RestControllerProps<D>>(endpointUrl: string, RestController: React.ComponentType<P & RestControllerProps<D>>) {
 

  return withSnackbar(
    class extends React.Component<Omit<P, keyof RestControllerProps<D>> & WithSnackbarProps, RestControllerState<D>> {
      socket:any;

      state: RestControllerState<D> = {
        data: undefined,
        loading: false,
        errorMessage: undefined,
      };

     
      connectSocket = () => {
        if (!this.socket){
            this.socket = io(SERVER_URL);
            console.log("connect");
        }

      }

      setData = (data: D) => {
        this.setState({
          data,
          loading: false,
          errorMessage: undefined
        });
      }

      loadData = () => {
        this.setState({
          data: undefined,
          loading: true,
          errorMessage: undefined
        });
        redirectingAuthorizedFetch(endpointUrl).then(response => {
          if (response.status === 200) {
            return response.json();
          }
          throw Error("Invalid status code: " + response.status);
        }).then(json => {
          this.setState({ data: json, loading: false })
        }).catch(error => {
          const errorMessage = error.message || "Unknown error";
          this.props.enqueueSnackbar("Problem fetching: " + errorMessage, { variant: 'error' });
          this.setState({ data: undefined, loading: false, errorMessage });
        });
      }

      saveData = () => {
        this.setState({ loading: true });
        redirectingAuthorizedFetch(endpointUrl, {
          method: 'POST',
          body: JSON.stringify(this.state.data),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(response => {
          if (response.status === 200) {
            return response.json();
          }
          throw Error("Invalid status code: " + response.status);
        }).then(json => {
          this.props.enqueueSnackbar("Changes successfully applied.", { variant: 'success' });
          this.setState({ data: json, loading: false });
        }).catch(error => {
          const errorMessage = error.message || "Unknown error";
          this.props.enqueueSnackbar("Problem saving: " + errorMessage, { variant: 'error' });
          this.setState({ data: undefined, loading: false, errorMessage });
        });
      }

      handleValueChange = (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log(doNow);
        const data = { ...this.state.data!, [name]: event.target.value };
        this.setState({ data });
      }

      handleCheckboxChange = (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const data = { ...this.state.data!, [name]: event.target.checked };
        this.setState({ data });
      }

      handleSliderChange = (name: keyof D, doNow?: boolean) => (event: React.ChangeEvent<{}>, value: number | number[]) => {
        console.log(doNow);
        
        const data = { ...this.state.data!, [name]: value };
        this.setState({ data });
      };

      render() {
        return <RestController
          handleValueChange={this.handleValueChange}
          handleCheckboxChange={this.handleCheckboxChange}
          handleSliderChange={this.handleSliderChange}
          setData={this.setData}
          saveData={this.saveData}
          loadData={this.loadData}
          connectSocket={this.connectSocket}
          {...this.state}
          {...this.props as P}
        />;
      }

    });
}
