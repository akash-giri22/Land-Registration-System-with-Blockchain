const LandRegistry = artifacts.require("LandRegistry");
const Property = artifacts.require("Property");
const TransferOwnerShip = artifacts.require("TransferOwnerShip");

contract("Land Registry production flow", (accounts) => {
  const [deployer, seller, buyer, revenueEmployee, attacker] = accounts;

  let landRegistry;
  let property;
  let transfer;

  const toWei = (value) => web3.utils.toWei(String(value), "ether");

  before(async () => {
    landRegistry = await LandRegistry.deployed();
    transfer = await TransferOwnerShip.deployed();

    const propertyAddress = await landRegistry.getPropertiesContract();
    property = await Property.at(propertyAddress);
  });

  it("wires the ownership-transfer contract securely", async () => {
    const configured = await property.transferOwnershipContract();
    assert.equal(
      configured.toLowerCase(),
      transfer.address.toLowerCase(),
      "Transfer contract was not authorized"
    );

    try {
      await landRegistry.setTransferOwnershipContractAddress(attacker, {
        from: attacker
      });
      assert.fail("Unauthorized caller was able to reconfigure transfer contract");
    } catch (error) {
      assert(error.message.includes("Caller is not the owner"));
    }
  });

  it("blocks direct unauthorized Property state mutation", async () => {
    await landRegistry.addLand(1, 101, 8, 48500, { from: seller });

    try {
      await property.changeStateToVerifed(1, attacker, { from: attacker });
      assert.fail("Unauthorized wallet mutated Property state");
    } catch (error) {
      assert(error.message.includes("Unauthorized caller"));
    }
  });

  it("completes request, acceptance, payment and ownership transfer", async () => {
    await landRegistry.mapRevenueDeptIdToEmployee(101, revenueEmployee, {
      from: deployer
    });

    await landRegistry.verifyProperty(1, { from: revenueEmployee });

    await transfer.addPropertyOnSale(1, 10, { from: seller });

    try {
      await transfer.sendPurchaseRequest(0, 9, { from: buyer });
      assert.fail("Below-asking-price request was accepted");
    } catch (error) {
      assert(error.message.includes("Offer is below asking price"));
    }

    await transfer.sendPurchaseRequest(0, 10, { from: buyer });

    try {
      await transfer.sendPurchaseRequest(0, 10, { from: buyer });
      assert.fail("Duplicate active buyer request was accepted");
    } catch (error) {
      assert(error.message.includes("Buyer already has an active request"));
    }

    await transfer.acceptBuyerRequest(0, buyer, 10, { from: seller });

    const acceptedSale = (await transfer.getMySales(seller))[0];
    assert.equal(
      acceptedSale.acceptedFor.toLowerCase(),
      buyer.toLowerCase(),
      "Buyer was not accepted"
    );
    assert.equal(
      acceptedSale.acceptedPrice.toString(),
      toWei(10),
      "Accepted price is incorrect"
    );

    await transfer.transferOwnerShip(0, {
      from: buyer,
      value: toWei(10)
    });

    const land = await landRegistry.getPropertyDetails(1);
    assert.equal(
      land.owner.toLowerCase(),
      buyer.toLowerCase(),
      "Ownership was not transferred to buyer"
    );
    assert.equal(land.state.toString(), "5", "Property is not in Bought state");

    const completedSale = (await transfer.getMySales(seller))[0];
    assert.equal(completedSale.state.toString(), "3", "Sale is not successful");
    assert.equal(completedSale.paymentDone, true, "Payment was not marked complete");
  });
});
