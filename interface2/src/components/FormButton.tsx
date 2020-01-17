import { Button, styled } from "@material-ui/core";

const FormButton = styled((Button))(props => ({
  margin: props.theme.spacing(0, 1),
  '&:last-child': {
    marginRight: 0,
  },
  '&:first-child': {
    marginLeft: 0,
  }
}));

export default FormButton;
